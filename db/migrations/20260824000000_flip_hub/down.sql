drop table if exists flip_tag;
drop table if exists tag;
drop index if exists flip_parent_flip_id_idx;
alter table flip
  drop column if exists parent_flip_id,
  drop column if exists retired;
