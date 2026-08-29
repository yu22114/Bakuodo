-- ============================================================================
-- LESSON・EVENT・NUMBERのジャンルにGIRLS/JAZZ/FREESTYLEを追加する。
--
-- アプリのコード側でジャンルを選ぶときは、genresテーブルを名前で検索して
-- そのidをcypher_genres/pl_genres/number_genresに紐づけている
-- （例: supabase.from("genres").select("id,name").in("name", form.genres)）。
-- そのため、genresテーブルに行が無いと「選んでも保存時に何も紐づかない」
-- という静かな不具合になる。この3行を足すだけ（既存の行には触れない）。
-- ============================================================================

insert into public.genres (name)
select v.name from (values ('Girls'), ('Jazz'), ('Freestyle')) as v(name)
where not exists (select 1 from public.genres g where g.name = v.name);
