-- =========================================================
-- CASERITO · 007 · El QR se activa más cerca del local (50 m)
-- 50 m ≈ media cuadra: lo más cerca que el GPS del celular
-- resuelve bien en la calle (dentro de un local puede errar 20–40 m).
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
alter table caserito.locales alter column radio_m set default 50;
update caserito.locales set radio_m = 50;
