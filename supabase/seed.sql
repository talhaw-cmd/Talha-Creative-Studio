-- SAMPLE CONTENT ONLY — replace via the admin panel
insert into public.categories (name, slug, position) values
  ('Packaging','packaging',1),('Branding','branding',2),('Posters','posters',3),
  ('Digital Ads','digital-ads',4),('Other','other',5)
on conflict (slug) do nothing;

insert into public.packages (name, slug, summary, price_type, price, currency, deliverables, revisions, turnaround_days, addons, faqs, terms, status, featured, position) values
('Snack Packaging Design','snack-packaging-design','Front/back pack design ready for print.','starting',150,'USD',
  array['Front & back design','2 realistic mockups','Print-ready source files'],3,7,
  '[{"name":"Extra flavour variant","price":40},{"name":"Additional mockup","price":15}]',
  '[{"q":"Do you provide the dieline?","a":"Send your printer''s dieline or ask me to prepare one."}]',
  'Client provides logo, copy and nutritional info. Printing not included.','published',true,1),
('Brand Identity Starter','brand-identity-starter','Logo, palette and typography basics.','quote',null,'USD',
  array['Logo suite','Colour palette','Typography guide'],2,10,'[]','[]','Scope confirmed after a short brief.','published',false,2)
on conflict (slug) do nothing;
