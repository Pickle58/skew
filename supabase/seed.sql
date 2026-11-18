-- Skew source seed. Run after schema.sql. Safe to re-run.
insert into public.sources (name, listing_url, parser_strategy, is_active, logo_url) values
  ('Reuters',      'https://www.reuters.com/',        'generic', true, null),
  ('NPR',          'https://www.npr.org/',            'generic', true, null),
  ('Fox News',     'https://www.foxnews.com/',        'generic', true, null),
  ('BBC News',     'https://www.bbc.com/news',        'generic', true, null),
  ('The Guardian', 'https://www.theguardian.com/us',  'generic', true, null)
on conflict do nothing;

update public.sources set parser_strategy = 'reuters'  where name = 'Reuters';
update public.sources set parser_strategy = 'npr'      where name = 'NPR';
update public.sources set parser_strategy = 'foxnews'  where name = 'Fox News';
update public.sources set parser_strategy = 'bbc'      where name = 'BBC News';
update public.sources set parser_strategy = 'guardian' where name = 'The Guardian';
