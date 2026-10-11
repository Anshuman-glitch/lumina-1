import re

for filename in ['index.html', 'style.css', 'app.js']:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    # Find all characters outside ASCII that could be emojis/stickers
    emojis = re.findall(r'[\U00010000-\U0010ffff]|[\u2600-\u27bf]', content)
    print(filename, 'emoji count:', len(emojis))
    if emojis:
        print(filename, 'remaining:', [ascii(e) for e in set(emojis)])

js_ids = re.findall(r"document\.getElementById\(['\"]([a-zA-Z0-9_-]+)['\"]\)", open('app.js', encoding='utf-8').read())
html_ids = set(re.findall(r'id=["\']([a-zA-Z0-9_-]+)["\']', open('index.html', encoding='utf-8').read()))
missing = [jid for jid in set(js_ids) if jid not in html_ids]
print('Missing IDs:', missing)
