
BEGIN;

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS '
DECLARE
    chars TEXT := ''ABCDEFGHJKLMNPQRSTUVWXYZ23456789'';
    result TEXT := '''';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
';

COMMIT;
