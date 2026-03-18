#!/usr/bin/env python3
"""
MaxArt Content V3.5 — HTML Preview Generator
Converts .md content files to styled HTML preview pages.
"""

import re
import os

CONTENT_DIR = os.path.join(os.path.dirname(__file__), '..')
OUTPUT_DIR = os.path.dirname(__file__)

# Page definitions: (filename, slug, nav_label)
# V3.5: 9 pages — Hub-Seiten für Leistungen und Branchen (keine Detail-Unterseiten)
PAGES = [
    ('01_Startseite.md', 'startseite', 'Startseite'),
    ('04_Leistungen_Hub.md', 'leistungen', 'Leistungen'),
    ('03_Branchen.md', 'branchen', 'Branchen'),
    ('10_Region_Abdeckung.md', 'region', 'Region'),
    ('11_Referenzen.md', 'referenzen', 'Referenzen'),
    ('13_Ueber_uns.md', 'ueber-uns', 'Über uns'),
    ('14_Kontakt.md', 'kontakt', 'Kontakt'),
    ('15_Impressum.md', 'impressum', 'Impressum'),
    ('16_Datenschutz.md', 'datenschutz', 'Datenschutz'),
]

# Schema.org types per page (for SEO bar)
SCHEMA_MAP = {
    'startseite': ['Organization', 'WebSite', 'FAQPage'],
    'leistungen': ['Organization', 'BreadcrumbList', 'Service ×3', 'FAQPage'],
    'branchen': ['Organization', 'BreadcrumbList', 'FAQPage'],
    'region': ['Organization', 'BreadcrumbList', 'FAQPage'],
    'referenzen': ['Organization', 'BreadcrumbList'],
    'ueber-uns': ['Organization', 'BreadcrumbList'],
    'kontakt': ['Organization', 'BreadcrumbList'],
    'impressum': ['Organization', 'BreadcrumbList'],
    'datenschutz': ['Organization', 'BreadcrumbList'],
}


def build_nav(active_slug):
    links = []
    for _, slug, label in PAGES:
        cls = ' class="active"' if slug == active_slug else ''
        links.append(f'<a href="{slug}.html"{cls}>{label}</a>')
    return '\n    '.join(links)


def html_wrap(title, slug, body, version):
    nav = build_nav(slug)
    return f'''<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | MaxArt Preview</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="site-nav">
    <div class="nav-inner">
      <a href="index.html" class="logo">MaxArt</a>
      {nav}
    </div>
  </nav>
  <div class="page">
    {body}
  </div>
  <div class="version-tag">{version}</div>
  <script>
    document.querySelectorAll('.faq-q').forEach(q => {{
      q.addEventListener('click', () => {{
        q.parentElement.classList.toggle('open');
      }});
    }});
  </script>
</body>
</html>'''


def parse_meta(text):
    """Extract title tag and meta description."""
    title = ''
    desc = ''
    m = re.search(r'\*\*Title Tag:\*\*\s*\n(.+)', text)
    if m:
        title = m.group(1).strip()
    m = re.search(r'\*\*Meta Description:\*\*\s*\n(.+)', text)
    if m:
        desc = m.group(1).strip()
    return title, desc


def extract_version(text):
    m = re.search(r'Content (V[\d.]+)', text)
    return m.group(1) if m else 'V3.5'


def escape(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def md_inline(s):
    """Convert basic markdown inline formatting."""
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\*(.+?)\*', r'<em>\1</em>', s)
    return s


def lines_to_paragraphs(lines):
    """Convert lines to paragraphs, handling lists."""
    html = []
    in_list = False
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_list:
                html.append('</ul>')
                in_list = False
            continue
        if stripped.startswith('- '):
            if not in_list:
                html.append('<ul>')
                in_list = True
            html.append(f'<li>{md_inline(stripped[2:])}</li>')
        else:
            if in_list:
                html.append('</ul>')
                in_list = False
            html.append(f'<p>{md_inline(stripped)}</p>')
    if in_list:
        html.append('</ul>')
    return '\n'.join(html)


def split_sections(text):
    """Split markdown into major sections by ## headers."""
    sections = []
    current_title = None
    current_lines = []

    for line in text.split('\n'):
        if line.startswith('## ') and not line.startswith('###'):
            if current_title is not None or current_lines:
                sections.append((current_title, '\n'.join(current_lines)))
            current_title = line[3:].strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_title is not None or current_lines:
        sections.append((current_title, '\n'.join(current_lines)))

    return sections


def is_internal_section(title):
    """Check if a section is internal-only and should be skipped."""
    if not title:
        return False
    skip = ['ВОПРОСЫ К КЛИЕНТУ', 'INTERNAL NOTES', 'Content V3']
    return any(s in title for s in skip)


def render_hero(content, page_slug):
    """Render hero section from content."""
    h1 = ''
    subline = ''
    body_lines = []
    primary_cta = ''
    secondary_cta = ''

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue
        if stripped == '**H1:**':
            continue
        if stripped.startswith('**Subline:**'):
            subline = stripped.replace('**Subline:**', '').strip()
            continue
        if stripped.startswith('**Primary CTA:**'):
            primary_cta = stripped.replace('**Primary CTA:**', '').strip()
            continue
        if stripped.startswith('**Secondary CTA:**'):
            secondary_cta = stripped.replace('**Secondary CTA:**', '').strip()
            continue
        if stripped.startswith('### ') or stripped.startswith('# '):
            continue
        if stripped and not h1 and not stripped.startswith('**') and not stripped.startswith('>'):
            h1 = stripped
            continue
        if stripped and h1 and not stripped.startswith('**'):
            body_lines.append(stripped)

    hero_text = ' '.join(body_lines) if body_lines else subline
    cta_html = ''
    if primary_cta or secondary_cta:
        btns = ''
        if primary_cta:
            btns += f'<a href="kontakt.html" class="btn">{primary_cta}</a>'
        if secondary_cta:
            btns += f' <a href="#leistungen" class="btn btn-outline">{secondary_cta}</a>'
        cta_html = f'<div class="hero-cta">{btns}</div>'

    return f'''<div class="hero">
      <h1>{md_inline(h1)}</h1>
      <p class="hero-text">{md_inline(hero_text)}</p>
      {cta_html}
    </div>'''


def render_problem(content):
    """Render problem section."""
    h2 = ''
    paras = []
    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue
        m = re.match(r'###\s+H2:\s*(.+)', stripped)
        if m:
            h2 = m.group(1)
            continue
        if stripped and not stripped.startswith('#'):
            paras.append(stripped)

    body = '\n'.join(f'<p>{md_inline(p)}</p>' for p in paras if p)
    return f'''<section class="problem">
      <h2>{md_inline(h2)}</h2>
      {body}
    </section>'''


def render_cards(content, section_title):
    """Render cards grid (Leistungen, Branchen etc.)."""
    h2 = ''
    cards = []
    current_card = None

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        # Section headline
        m = re.match(r'###\s+Sektions-Headline', stripped)
        if m:
            continue
        m = re.match(r'###\s+H2:\s*(.+)', stripped)
        if m:
            h2 = m.group(1)
            continue

        # Card start
        m = re.match(r'####\s+(?:Karte \d+:\s*)?(.+)', stripped)
        if m:
            if current_card:
                cards.append(current_card)
            current_card = {'title': m.group(1), 'subtitle': '', 'text': [], 'link': ''}
            continue

        if current_card is not None:
            if stripped.startswith('**Subtitle:**'):
                current_card['subtitle'] = stripped.replace('**Subtitle:**', '').strip()
            elif stripped.startswith('→ **'):
                link_text = re.sub(r'→\s*\*\*(.+?)\*\*', r'\1', stripped)
                current_card['link'] = link_text
            elif stripped:
                current_card['text'].append(stripped)
        elif stripped and not stripped.startswith('#') and not stripped.startswith('>'):
            if not h2:
                h2 = stripped

    if current_card:
        cards.append(current_card)

    if not h2 and section_title:
        h2 = re.sub(r'^BLOCK \d+\s*—\s*', '', section_title)

    cards_html = []
    for c in cards:
        sub = f'<div class="subtitle">{md_inline(c["subtitle"])}</div>' if c['subtitle'] else ''
        text = ' '.join(c['text'])
        link = f'<a class="card-link" href="#">{c["link"]} &rarr;</a>' if c['link'] else ''
        cards_html.append(f'''<div class="card">
        <h3>{md_inline(c["title"])}</h3>
        {sub}
        <p>{md_inline(text)}</p>
        {link}
      </div>''')

    return f'''<section>
      <h2>{md_inline(h2)}</h2>
      <div class="cards">
        {''.join(cards_html)}
      </div>
    </section>'''


def render_steps(content):
    """Render process steps."""
    h2 = ''
    steps = []
    current_step = None

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        m = re.match(r'###\s+(?:Sektions-Headline|H2:\s*(.+))', stripped)
        if m:
            if m.group(1):
                h2 = m.group(1)
            continue

        m = re.match(r'\*\*Schritt \d+:\s*(.+?)\*\*', stripped)
        if m:
            if current_step:
                steps.append(current_step)
            current_step = {'title': m.group(1), 'text': []}
            continue

        if current_step is not None and stripped:
            current_step['text'].append(stripped)
        elif stripped and not h2 and not stripped.startswith('#'):
            h2 = stripped

    if current_step:
        steps.append(current_step)

    if not h2:
        h2 = 'Der Prozess'

    steps_html = []
    for s in steps:
        text = ' '.join(s['text'])
        steps_html.append(f'''<div class="step">
        <div class="step-content">
          <h3>{md_inline(s["title"])}</h3>
          <p>{md_inline(text)}</p>
        </div>
      </div>''')

    return f'''<section>
      <h2>{md_inline(h2)}</h2>
      <div class="steps">
        {''.join(steps_html)}
      </div>
    </section>'''


def render_proof(content):
    """Render proof/Zahlen grid."""
    h2 = ''
    items = []
    current = None
    ref_line = ''

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        m = re.match(r'###\s+(?:Sektions-Headline|H2:\s*(.+))', stripped)
        if m:
            if m.group(1):
                h2 = m.group(1)
            continue

        m = re.match(r'\*\*(.+?)\*\*$', stripped)
        if m and not stripped.startswith('['):
            if current:
                items.append(current)
            current = {'number': m.group(1), 'label': ''}
            continue

        m = re.match(r'\*\*(.+?):\*\*\s*(.*)', stripped)
        if m and not stripped.startswith('['):
            if current:
                items.append(current)
            current = {'number': m.group(1), 'label': m.group(2) if m.group(2) else ''}
            continue

        if stripped.startswith('**Referenzen'):
            ref_line = stripped
            current = None
            continue

        if current is not None and stripped:
            current['label'] = stripped

        if stripped.startswith('[КЛИЕНТ:'):
            if current:
                items.append(current)
                current = None

    if current:
        items.append(current)

    if not h2:
        h2 = 'Zahlen & Fakten'

    items_html = []
    for item in items:
        items_html.append(f'''<div class="proof-item">
        <span class="number">{md_inline(item["number"])}</span>
        <span class="label">{md_inline(item["label"])}</span>
      </div>''')

    ref_html = ''
    if ref_line:
        refs = re.sub(r'\*\*Referenzen.*?:\*\*\s*', '', ref_line)
        names = [n.strip() for n in refs.split(',')]
        spans = ''.join(f'<span>{n}</span>' for n in names if n)
        ref_html = f'<div class="ref-logos">{spans}</div>'

    return f'''<section>
      <h2>{md_inline(h2)}</h2>
      <div class="proof-grid">
        {''.join(items_html)}
      </div>
      {ref_html}
    </section>'''


def render_trust_bar(content):
    """Render trust bar (3 columns)."""
    items = []
    current = None

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        m = re.match(r'\*\*\d+\.\s+(.+?)\*\*', stripped)
        if m:
            if current:
                items.append(current)
            current = {'title': m.group(1), 'text': []}
            continue

        if current is not None and stripped:
            current['text'].append(stripped)

    if current:
        items.append(current)

    items_html = []
    for item in items:
        text = ' '.join(item['text'])
        items_html.append(f'''<div class="trust-item">
        <h3>{md_inline(item["title"])}</h3>
        <p>{md_inline(text)}</p>
      </div>''')

    return f'''<div class="trust-bar">
      {''.join(items_html)}
    </div>'''


def render_faq(content):
    """Render FAQ accordion."""
    h2 = ''
    faqs = []
    current = None

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        m = re.match(r'###\s+(?:Sektions-Headline|H2:\s*(.+))', stripped)
        if m:
            if m.group(1):
                h2 = m.group(1)
            continue

        m = re.match(r'\*\*(.+?\?)\*\*', stripped)
        if m:
            if current:
                faqs.append(current)
            current = {'q': m.group(1), 'a': []}
            continue

        if current is not None and stripped:
            current['a'].append(stripped)

    if current:
        faqs.append(current)

    if not h2:
        h2 = 'Häufig gestellte Fragen'

    faq_html = []
    for faq in faqs:
        answer = ' '.join(faq['a'])
        faq_html.append(f'''<div class="faq-item">
        <div class="faq-q">{escape(faq["q"])}</div>
        <div class="faq-a"><p>{md_inline(answer)}</p></div>
      </div>''')

    return f'''<section>
      <h2>{md_inline(h2)}</h2>
      <div class="faq">
        {''.join(faq_html)}
      </div>
    </section>'''


def render_cta(content):
    """Render CTA section."""
    h2 = ''
    text_lines = []
    button = ''
    contacts = []

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        m = re.match(r'###\s+(?:Sektions-Headline|H2:\s*(.+))', stripped)
        if m:
            if m.group(1):
                h2 = m.group(1)
            continue

        if stripped.startswith('### Formular') or stripped.startswith('### Direktkontakt'):
            continue

        m = re.match(r'\*\*(?:Primary )?(?:Button|CTA):\*\*\s*(.*)', stripped)
        if m:
            button = m.group(1)
            continue

        if re.match(r'\*\*Tagsüber', stripped) or re.match(r'\*\*Nachts', stripped) or re.match(r'\*\*E-Mail', stripped):
            contacts.append(stripped)
            continue

        if stripped and not stripped.startswith('#') and not stripped.startswith('>') and not stripped.startswith('['):
            text_lines.append(stripped)

    if not h2 and text_lines:
        h2 = text_lines.pop(0)

    body = ' '.join(text_lines)
    btn_html = f'<a href="kontakt.html" class="btn">{button}</a>' if button else ''
    contacts_html = ''
    if contacts:
        items = ' '.join(f'<a href="#">{md_inline(c)}</a>' for c in contacts)
        contacts_html = f'<div class="contact-info">{items}</div>'

    return f'''<div class="cta-section">
      <h2>{md_inline(h2)}</h2>
      <p>{md_inline(body)}</p>
      {btn_html}
      {contacts_html}
    </div>'''


def render_form_section(content, section_title):
    """Render a form section: h2 + intro + form widget only."""
    h2 = ''
    intro = ''

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue
        m = re.match(r'###\s+H2:\s*(.+)', stripped)
        if m:
            h2 = m.group(1)
            continue
        # First non-heading, non-form-field line is intro
        if stripped.startswith('### '):
            continue
        if not intro and stripped and not stripped.startswith('**') and not stripped.startswith('-') and not stripped.startswith('[') and not stripped.startswith('Placeholder') and not stripped.startswith('Bitte'):
            intro = stripped
            continue

    if not h2 and section_title:
        h2 = re.sub(r'^BLOCK \d+\s*—\s*', '', section_title)

    form_html = render_form(content)
    intro_html = f'<p>{md_inline(intro)}</p>' if intro else ''

    return f'''<section>
      <h2>{md_inline(h2)}</h2>
      {intro_html}
      {form_html}
    </section>'''


def render_form(content):
    """Render contact form preview."""
    fields = []
    button = ''
    intro_lines = []

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---' or stripped.startswith('###'):
            continue

        # Match field: **Label** *(hint)* or - **Label** *(hint)*
        m = re.match(r'-?\s*\*\*(.+?)\*\*\s*\*\((.+?)\)\*', stripped)
        if m:
            fields.append({'label': m.group(1), 'hint': m.group(2)})
            continue

        if stripped.startswith('Placeholder:'):
            if fields:
                fields[-1]['placeholder'] = stripped.replace('Placeholder:', '').strip().strip('"').strip('\u201e').strip('\u201c')
            continue

        # Match: Placeholder inside the text
        m2 = re.match(r'Placeholder:\s*(.+)', stripped)
        if m2 and fields:
            fields[-1]['placeholder'] = m2.group(1).strip().strip('"').strip('\u201e').strip('\u201c')
            continue

        m = re.match(r'\*\*(?:Primary )?(?:Button|CTA):\*\*\s*(.*)', stripped)
        if m:
            button = m.group(1)
            continue

        if stripped.startswith('Bitte beschreiben'):
            continue
        if stripped.startswith('- ') and fields:
            continue

        if stripped and not stripped.startswith('[') and not stripped.startswith('**Datenschutz') and not stripped.startswith('**Secondary'):
            intro_lines.append(stripped)

    fields_html = []
    for f in fields:
        placeholder = f.get('placeholder', '')
        is_textarea = 'Freitext' in f.get('hint', '') or 'Anforderung' in f['label']
        is_dropdown = 'Dropdown' in f.get('hint', '')

        if is_dropdown:
            fields_html.append(f'''<div class="form-field">
          <label>{md_inline(f["label"])}</label>
          <select><option>Ja, bereits bestehend</option><option>Ja, geplant</option><option>Noch in der Evaluierung</option></select>
        </div>''')
        elif is_textarea:
            fields_html.append(f'''<div class="form-field">
          <label>{md_inline(f["label"])}</label>
          <textarea placeholder="{escape(placeholder)}"></textarea>
        </div>''')
        else:
            fields_html.append(f'''<div class="form-field">
          <label>{md_inline(f["label"])}</label>
          <input type="text" placeholder="{escape(placeholder)}">
        </div>''')

    btn = f'<button class="btn">{button}</button>' if button else ''

    return f'''<div class="form-preview">
      {''.join(fields_html)}
      {btn}
    </div>'''


def render_solution_items(content):
    """Render solution items with blue left border."""
    h2 = ''
    items = []
    current = None
    intro_lines = []

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        m = re.match(r'###\s+H2:\s*(.+)', stripped)
        if m:
            h2 = m.group(1)
            continue

        m = re.match(r'####\s+(.+)', stripped)
        if m:
            if current:
                items.append(current)
            current = {'title': m.group(1), 'text': []}
            continue

        if current is not None:
            if stripped.startswith('→ **'):
                link_text = re.sub(r'→\s*\*\*(.+?)\*\*', r'\1', stripped)
                current['link'] = link_text
            elif stripped:
                current['text'].append(stripped)
        elif stripped and not stripped.startswith('#') and not stripped.startswith('>'):
            intro_lines.append(stripped)

    if current:
        items.append(current)

    intro = ''.join(f'<p>{md_inline(l)}</p>' for l in intro_lines)

    items_html = []
    for item in items:
        text = ' '.join(item['text'])
        link = f'<p><a class="internal-link" href="#">{item.get("link", "")} &rarr;</a></p>' if item.get('link') else ''
        items_html.append(f'''<div class="solution-item">
        <h3>{md_inline(item["title"])}</h3>
        <p>{md_inline(text)}</p>
        {link}
      </div>''')

    return f'''<section>
      <h2>{md_inline(h2)}</h2>
      {intro}
      {''.join(items_html)}
    </section>'''


def render_for_whom(content):
    """Render 'Für wen' grid."""
    h2 = ''
    items = []
    current = None
    intro_lines = []

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        m = re.match(r'###\s+H2:\s*(.+)', stripped)
        if m:
            h2 = m.group(1)
            continue

        m = re.match(r'####\s+(.+)', stripped)
        if m:
            if current:
                items.append(current)
            current = {'title': m.group(1), 'text': [], 'link': ''}
            continue

        if current is not None:
            if stripped.startswith('→ **'):
                link_text = re.sub(r'→\s*\*\*(.+?)\*\*', r'\1', stripped)
                current['link'] = link_text
            elif stripped:
                current['text'].append(stripped)
        elif stripped and not stripped.startswith('#') and not stripped.startswith('>'):
            intro_lines.append(stripped)

    if current:
        items.append(current)

    intro = ''.join(f'<p>{md_inline(l)}</p>' for l in intro_lines)

    items_html = []
    for item in items:
        text = ' '.join(item['text'])
        link = f'<p><a class="internal-link" href="#">{item.get("link", "")} &rarr;</a></p>' if item.get('link') else ''
        items_html.append(f'''<div class="for-whom-item">
        <h3>{md_inline(item["title"])}</h3>
        <p>{md_inline(text)}</p>
        {link}
      </div>''')

    return f'''<section>
      <h2>{md_inline(h2)}</h2>
      {intro}
      <div class="for-whom-grid">
        {''.join(items_html)}
      </div>
    </section>'''


def render_generic_section(content, section_title):
    """Render a generic section with h2 + paragraphs/items."""
    h2 = ''
    items = []
    current = None
    body_lines = []
    links = []

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        m = re.match(r'###\s+(?:Sektions-Headline|H2:\s*(.+))', stripped)
        if m:
            if m.group(1):
                h2 = m.group(1)
            continue
        if stripped.startswith('### '):
            continue

        # Bold item (numbered or not)
        m = re.match(r'\*\*(\d+\.\s+)?(.+?)\*\*$', stripped)
        if m and not stripped.startswith('['):
            if current:
                items.append(current)
            current = {'title': m.group(2) if m.group(2) else m.group(1), 'text': []}
            continue

        m = re.match(r'\*\*(.+?):\*\*\s*(.*)', stripped)
        if m and not stripped.startswith('[') and not stripped.startswith('**Referenzen'):
            if current:
                items.append(current)
            title = m.group(1)
            rest = m.group(2)
            current = {'title': title, 'text': [rest] if rest else []}
            continue

        if stripped.startswith('→ **'):
            link_text = re.sub(r'→\s*\*\*(.+?)\*\*', r'\1', stripped)
            links.append(link_text)
            continue

        if stripped.startswith('[КЛИЕНТ:'):
            placeholder_text = stripped[1:-1] if stripped.endswith(']') else stripped
            body_lines.append(f'<div class="placeholder">{escape(placeholder_text)}</div>')
            if current:
                items.append(current)
                current = None
            continue

        if current is not None and stripped:
            current['text'].append(stripped)
        elif stripped and not stripped.startswith('#') and not stripped.startswith('>'):
            if not h2:
                h2 = stripped
            else:
                body_lines.append(stripped)

    if current:
        items.append(current)

    if not h2 and section_title:
        h2 = re.sub(r'^BLOCK \d+\s*—\s*', '', section_title)

    parts = [f'<h2>{md_inline(h2)}</h2>']

    if items and len(items) >= 3:
        # Render as trust-bar style
        trust_items = []
        for item in items:
            text = ' '.join(item['text'])
            trust_items.append(f'''<div class="trust-item">
          <h3>{md_inline(item["title"])}</h3>
          <p>{md_inline(text)}</p>
        </div>''')
        parts.append(f'<div class="trust-bar">{"".join(trust_items)}</div>')
    elif items:
        for item in items:
            text = ' '.join(item['text'])
            parts.append(f'''<div class="solution-item">
          <h3>{md_inline(item["title"])}</h3>
          <p>{md_inline(text)}</p>
        </div>''')

    for bl in body_lines:
        if bl.startswith('<div'):
            parts.append(bl)
        else:
            parts.append(f'<p>{md_inline(bl)}</p>')

    for link in links:
        parts.append(f'<p><a class="internal-link" href="#">{link} &rarr;</a></p>')

    return f'''<section>
      {''.join(parts)}
    </section>'''


def render_ref_logos(content):
    """Render reference logos section."""
    h2 = ''
    logos = []
    extra = []

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        m = re.match(r'###\s+H2:\s*(.+)', stripped)
        if m:
            h2 = m.group(1)
            continue

        m = re.match(r'\*\*(.+?)\*\*\s*—\s*(.+)', stripped)
        if m:
            logos.append({'name': m.group(1), 'desc': m.group(2)})
            continue

        if stripped.startswith('[КЛИЕНТ:'):
            extra.append(f'<div class="placeholder">{escape(stripped[1:-1] if stripped.endswith("]") else stripped)}</div>')

    if not h2:
        h2 = 'Unsere Partner'

    logo_spans = ''.join(f'<span>{l["name"]}</span>' for l in logos)
    extras = ''.join(extra)

    return f'''<section>
      <h2>{md_inline(h2)}</h2>
      <div class="ref-logos">{logo_spans}</div>
      {extras}
    </section>'''


def classify_section(title, content):
    """Determine section type based on title and content patterns."""
    if not title:
        return 'skip'

    t = title.upper()

    if is_internal_section(title):
        return 'skip'

    if 'HERO' in t or 'EINLEITUNG' in t:
        return 'hero'
    if 'PROBLEM' in t:
        return 'problem'
    if 'FAQ' in t:
        return 'faq'
    if 'CTA' in t and 'KONTAKTFORMULAR' not in t:
        return 'cta'
    if 'KONTAKTFORMULAR' in t:
        return 'form'
    if 'PROZESS' in t or 'WIE ES FUNKTIONIERT' in t or ('PASSIERT' in t and 'ANFRAGE' in t):
        return 'steps'
    if 'ZAHLEN' in t or 'PROOF' in t or 'SICHERHEIT' in t:
        return 'proof'
    if 'LEISTUNGEN' in t or ('KARTEN' in t) or ('KERNLEISTUNGEN' in t):
        return 'cards'
    if 'BRANCHEN' in t and 'SEGMENT' not in t:
        return 'cards'
    if 'FÜR WEN' in t or 'FÜR WEN' in t:
        return 'for_whom'
    if 'LÖSUNG' in t or 'UNSERE LÖSUNG' in t:
        return 'solution'
    if 'TRUST' in t:
        return 'trust'
    if 'SEGMENT' in t:
        return 'segment'
    if 'UNSERE PARTNER' in t and 'Glavista' in content:
        return 'ref_logos'
    if 'REGION' in t or 'ABDECKUNG' in t:
        return 'generic'
    if 'REFERENZEN' in t:
        return 'generic'

    # Check for step patterns
    if '**Schritt' in content:
        return 'steps'

    # Check for #### patterns (cards or solution items)
    if re.search(r'####\s+Karte', content):
        return 'cards'
    if content.count('####') >= 2:
        return 'solution'

    return 'generic'


def render_segment(content, section_title):
    """Render a branch segment (from 03_Branchen)."""
    h2 = ''
    parts = []
    current_sub = None

    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('<!-- '):
            continue
        if stripped == '---':
            continue

        m = re.match(r'###\s+H2:\s*(.+)', stripped)
        if m:
            h2 = m.group(1)
            continue

        m = re.match(r'####\s+(.+)', stripped)
        if m:
            if current_sub:
                parts.append(current_sub)
            current_sub = {'title': m.group(1), 'text': []}
            continue

        if stripped.startswith('→ **') or stripped.startswith('**→'):
            link_text = re.sub(r'[\*→]+\s*', '', stripped).strip('* ')
            if current_sub:
                current_sub['link'] = link_text
            continue

        if stripped.startswith('[КЛИЕНТ:'):
            parts.append({'type': 'placeholder', 'text': stripped[1:-1] if stripped.endswith(']') else stripped})
            if current_sub:
                parts.append(current_sub)
                current_sub = None
            continue

        if current_sub is not None and stripped:
            current_sub['text'].append(stripped)
        elif stripped and not stripped.startswith('#'):
            if not h2:
                h2 = stripped
            else:
                parts.append({'type': 'text', 'text': stripped})

    if current_sub:
        parts.append(current_sub)

    html_parts = [f'<h2>{md_inline(h2)}</h2>']
    for p in parts:
        if isinstance(p, dict) and p.get('type') == 'placeholder':
            html_parts.append(f'<div class="placeholder">{escape(p["text"])}</div>')
        elif isinstance(p, dict) and p.get('type') == 'text':
            html_parts.append(f'<p>{md_inline(p["text"])}</p>')
        elif isinstance(p, dict) and 'title' in p:
            text = ' '.join(p.get('text', []))
            link = f'<p><a class="internal-link" href="#">{p.get("link", "")} &rarr;</a></p>' if p.get('link') else ''
            html_parts.append(f'''<div class="solution-item">
          <h3>{md_inline(p["title"])}</h3>
          <p>{md_inline(text)}</p>
          {link}
        </div>''')

    return f'''<div class="segment">
      {''.join(html_parts)}
    </div>'''


def convert_page(md_text, page_slug):
    """Convert a full markdown page to HTML body content."""
    title, desc = parse_meta(md_text)
    version = extract_version(md_text)

    sections = split_sections(md_text)
    body_parts = []

    # SEO bar
    if title:
        title_len = len(title)
        desc_len = len(desc)
        title_cls = 'len-ok' if title_len <= 60 else ('len-warn' if title_len <= 70 else 'len-over')
        desc_cls = 'len-ok' if desc_len <= 160 else ('len-warn' if desc_len <= 170 else 'len-over')
        # Extract URL from md
        url_match = re.search(r'\*\*URL:\*\*\s*`?(/[^`\s]*)`?', md_text)
        page_url = url_match.group(1) if url_match else f'/{page_slug}/'
        # Schema tags
        schemas = SCHEMA_MAP.get(page_slug, ['Organization', 'BreadcrumbList'])
        schema_tags = ''.join(f'<span class="schema-tag">{s}</span>' for s in schemas)
        body_parts.append(f'''<div class="seo-bar">
      <div class="seo-bar-header" onclick="this.parentElement.classList.toggle(\'collapsed\')">
        <span class="seo-icon">🔍</span>
        <span class="seo-label">SEO &amp; Schema.org</span>
        <span class="seo-toggle">▼</span>
      </div>
      <div class="seo-bar-body">
        <div class="seo-bar-row">
          <span class="seo-key">Title</span>
          <span class="seo-val">{escape(title)} <span class="len-badge {title_cls}">{title_len}</span></span>
        </div>
        <div class="seo-bar-row">
          <span class="seo-key">Description</span>
          <span class="seo-val">{escape(desc)} <span class="len-badge {desc_cls}">{desc_len}</span></span>
        </div>
        <div class="seo-bar-row">
          <span class="seo-key">URL</span>
          <span class="seo-val"><code>{page_url}</code></span>
        </div>
        <div class="seo-bar-row">
          <span class="seo-key">Schema.org</span>
          <span class="seo-val"><div class="schema-tags">{schema_tags}</div></span>
        </div>
      </div>
    </div>''')

    for sec_title, sec_content in sections:
        if not sec_title:
            continue

        sec_type = classify_section(sec_title, sec_content)

        if sec_type == 'skip':
            continue
        elif sec_type == 'hero':
            body_parts.append(render_hero(sec_content, page_slug))
        elif sec_type == 'problem':
            body_parts.append(render_problem(sec_content))
        elif sec_type == 'faq':
            body_parts.append(render_faq(sec_content))
        elif sec_type == 'cta':
            body_parts.append(render_cta(sec_content))
        elif sec_type == 'form':
            body_parts.append(render_form_section(sec_content, sec_title))
        elif sec_type == 'steps':
            body_parts.append(render_steps(sec_content))
        elif sec_type == 'proof':
            body_parts.append(render_proof(sec_content))
        elif sec_type == 'cards':
            body_parts.append(render_cards(sec_content, sec_title))
        elif sec_type == 'for_whom':
            body_parts.append(render_for_whom(sec_content))
        elif sec_type == 'solution':
            body_parts.append(render_solution_items(sec_content))
        elif sec_type == 'trust':
            body_parts.append(render_trust_bar(sec_content))
        elif sec_type == 'segment':
            body_parts.append(render_segment(sec_content, sec_title))
        elif sec_type == 'ref_logos':
            body_parts.append(render_ref_logos(sec_content))
        else:
            body_parts.append(render_generic_section(sec_content, sec_title))

    body = '\n\n'.join(body_parts)
    page_title = title.split('—')[0].strip() if '—' in title else title.split('|')[0].strip()

    return html_wrap(page_title, page_slug, body, version), title


def generate_index():
    """Generate index.html with links to all pages."""
    nav = build_nav('')
    cards = []
    for fname, slug, label in PAGES:
        num = fname[:2]
        cards.append(f'''<div class="card">
        <h3>{num}. {label}</h3>
        <a class="card-link" href="{slug}.html">{label} &rarr;</a>
      </div>''')

    body = f'''<div class="hero">
      <h1>MaxArt Transport — Content V3.5 Preview</h1>
      <p class="hero-text">9 Seiten zur Durchsicht. Enriched Hub-Seiten für Leistungen und Branchen.</p>
    </div>
    <div class="meta-bar">
      <strong>Stand:</strong> 2026-03-18 | <strong>Version:</strong> Content V3.5 | <strong>Seiten:</strong> 9
    </div>
    <section>
      <h2>Alle Seiten</h2>
      <div class="cards">
        {''.join(cards)}
      </div>
    </section>'''

    return f'''<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MaxArt Content V3.5 — Preview Index</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="site-nav">
    <div class="nav-inner">
      <a href="index.html" class="logo">MaxArt</a>
      {nav}
    </div>
  </nav>
  <div class="page">
    {body}
  </div>
  <div class="version-tag">V3.5</div>
</body>
</html>'''


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Generate index
    index_html = generate_index()
    with open(os.path.join(OUTPUT_DIR, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(index_html)
    print('Generated: index.html')

    # Generate each page
    for fname, slug, label in PAGES:
        md_path = os.path.join(CONTENT_DIR, fname)
        if not os.path.exists(md_path):
            print(f'SKIP (not found): {fname}')
            continue

        with open(md_path, 'r', encoding='utf-8') as f:
            md_text = f.read()

        html_content, title = convert_page(md_text, slug)
        out_path = os.path.join(OUTPUT_DIR, f'{slug}.html')
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f'Generated: {slug}.html — {title[:60]}')

    print(f'\nDone! {len(PAGES) + 1} files generated in {OUTPUT_DIR}')


if __name__ == '__main__':
    main()
