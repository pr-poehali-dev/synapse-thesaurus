import json
import os
from typing import Dict, Any, List
import urllib.request
import urllib.parse

def get_datamuse_synonyms(word: str, lang: str = 'en') -> List[Dict[str, Any]]:
    """
    Получает синонимы через Datamuse API (бесплатный, без ключа)
    """
    try:
        if lang == 'en':
            url = f"https://api.datamuse.com/words?rel_syn={urllib.parse.quote(word)}&max=10"
        else:
            return []
        
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return [{'word': item['word'], 'score': item.get('score', 0)} for item in data]
    except Exception as e:
        print(f"Datamuse API error: {e}")
        return []

def get_contextual_synonyms(word: str, context: str, lang: str) -> List[Dict[str, str]]:
    """
    Получает контекстуальные синонимы через OpenAI API
    """
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return []
    
    try:
        prompt = f"""Provide 5 contextual synonyms for the word "{word}" in this context: "{context[:200]}..."
Language: {"Russian" if lang == 'ru' else "English"}
Return ONLY a JSON array of objects with "word" and "context" fields. No explanations.
Example: [{{"word": "synonym1", "context": "brief context"}}, ...]"""

        data = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 300
        }
        
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(data).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode())
            content = result['choices'][0]['message']['content'].strip()
            
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            
            synonyms = json.loads(content)
            return synonyms if isinstance(synonyms, list) else []
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return []

def detect_language(text: str) -> str:
    """
    Простое определение языка текста
    """
    cyrillic_chars = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
    latin_chars = sum(1 for c in text if 'a' <= c.lower() <= 'z')
    
    return 'ru' if cyrillic_chars > latin_chars else 'en'

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Получение синонимов с контекстным анализом
    Args: event - dict с httpMethod, body (word, context, lang)
    Returns: HTTP response с синонимами
    """
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        try:
            body_data = json.loads(event.get('body', '{}'))
            word = body_data.get('word', '').strip().lower()
            context = body_data.get('context', '')
            lang = body_data.get('lang', '')
            
            if not word:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Word is required'}),
                    'isBase64Encoded': False
                }
            
            if not lang:
                lang = detect_language(word)
            
            synonyms = []
            
            if lang == 'en':
                datamuse_results = get_datamuse_synonyms(word, lang)
                synonyms.extend([
                    {'word': syn['word'], 'context': 'general synonym', 'source': 'datamuse'}
                    for syn in datamuse_results[:5]
                ])
            
            if context and len(context) > 10:
                contextual = get_contextual_synonyms(word, context, lang)
                for syn in contextual:
                    if isinstance(syn, dict) and 'word' in syn:
                        syn['source'] = 'contextual'
                        synonyms.append(syn)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'word': word,
                    'language': lang,
                    'synonyms': synonyms,
                    'count': len(synonyms)
                }),
                'isBase64Encoded': False
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': str(e)}),
                'isBase64Encoded': False
            }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
