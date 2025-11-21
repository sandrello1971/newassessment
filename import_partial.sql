-- Importa solo utenti
DELETE FROM local_users WHERE id IN ('user-sandrello', 'user-lsala');

COPY public.local_users (id, email, password, role, must_change_password) FROM stdin;
user-sandrello	sandrello@noscite.it	$2b$12$vEljS3Burt.Y8eCcpe2lOOPHRbyCDv/wDkRmvjjIEXeW8MwQsmnn.	admin	f
user-lsala	lsala@noscite.it	$2b$12$XZ1e2ssjwr5Zu309L/qTAuY6exS4LmY3bN5LhD/Kn1SD9LFRXw6s6	admin	f
\.
