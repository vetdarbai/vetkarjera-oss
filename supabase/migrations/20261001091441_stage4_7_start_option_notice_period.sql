-- One approved catalog option; existing codes, labels and ordering are unchanged.
begin;
insert into public.start_options (code, label_lt, sort_order, is_active)
values ('notice_period', 'Po įspėjimo termino (20 kalendorinių dienų)', 6, true);
commit;
