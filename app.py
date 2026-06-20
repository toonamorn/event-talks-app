import hashlib
import logging
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request
import requests

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def get_stable_id(date_str, category_str, content_str):
    """Generate a stable unique ID for each release item based on its contents."""
    hash_input = f"{date_str}-{category_str}-{content_str}"
    return hashlib.md5(hash_input.encode('utf-8')).hexdigest()

def parse_release_notes():
    """Fetch and parse the BigQuery release notes XML feed."""
    try:
        # Fetch the feed XML using requests with a timeout
        logger.info(f"Fetching BigQuery release notes feed from {FEED_URL}")
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse feed content with feedparser
        feed_data = feedparser.parse(response.content)
        
        if not feed_data.entries:
            logger.warning("No entries found in parsed feed data.")
            return []
            
        parsed_items = []
        
        for entry in feed_data.entries:
            date_str = entry.title  # Usually like "June 17, 2026"
            feed_link = entry.link  # Link to the specific date/anchor
            updated_time = entry.get('updated', '')
            
            # The HTML content of the entry
            content_html = ""
            if 'content' in entry and len(entry.content) > 0:
                content_html = entry.content[0].value
            elif 'summary' in entry:
                content_html = entry.summary
                
            if not content_html:
                continue
                
            soup = BeautifulSoup(content_html, 'html.parser')
            
            # Find all category headings (usually h3)
            h3_headings = soup.find_all('h3')
            
            if not h3_headings:
                # If there are no h3 tags, treat the entire body as a single general update
                clean_html = soup.decode_contents().strip()
                clean_text = soup.get_text(separator=' ', strip=True)
                item_id = get_stable_id(date_str, "Update", clean_html)
                parsed_items.append({
                    "id": item_id,
                    "date": date_str,
                    "updated_time": updated_time,
                    "category": "Update",
                    "html": clean_html,
                    "text": clean_text,
                    "link": feed_link
                })
                continue
                
            # Iterate through the elements to group siblings with their respective h3 categories
            for h3 in h3_headings:
                category = h3.get_text(strip=True)
                
                # Gather all siblings after this h3 until the next h3
                sibling_elements = []
                next_node = h3.next_sibling
                while next_node and next_node.name != 'h3':
                    if next_node.name:  # Only add tag elements, skip plain whitespace text nodes
                        sibling_elements.append(next_node)
                    next_node = next_node.next_sibling
                
                # Build HTML content for this specific category update
                item_soup = BeautifulSoup("", "html.parser")
                for el in sibling_elements:
                    item_soup.append(el)
                    
                item_html = item_soup.decode_contents().strip()
                item_text = item_soup.get_text(separator=' ', strip=True)
                
                # Filter out empty updates
                if not item_html:
                    continue
                    
                item_id = get_stable_id(date_str, category, item_html)
                parsed_items.append({
                    "id": item_id,
                    "date": date_str,
                    "updated_time": updated_time,
                    "category": category,
                    "html": item_html,
                    "text": item_text,
                    "link": feed_link
                })
                
        logger.info(f"Successfully parsed {len(parsed_items)} items from feed.")
        return parsed_items
        
    except requests.exceptions.RequestException as e:
        logger.error(f"HTTP error fetching feed: {str(e)}")
        raise RuntimeError(f"Failed to fetch feed: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing feed contents: {str(e)}")
        raise RuntimeError(f"Failed to parse feed: {str(e)}")

@app.route('/')
def index():
    """Render the index page."""
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    """API endpoint to get the parsed release notes."""
    try:
        releases = parse_release_notes()
        return jsonify({
            "status": "success",
            "count": len(releases),
            "data": releases
        })
    except Exception as e:
        logger.exception("Failed to get releases")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Using thread-safe and debug-enabled execution
    app.run(debug=True, host='127.0.0.1', port=5000)
