-- 0020_retire_the_marks.sql
-- Pre/post tests and their marks leave the product.
--
-- The library is an information service: people find the material for a training
-- they attended, read it, download it, and acknowledge the protocols that ask for
-- a signature. It never graded anybody, and the machinery for grading was still
-- here — question banks, attempts, pass marks, best scores, a "scores post to your
-- transcript" page — which read as a credential nobody had promised. ADR-0026.
--
-- Nothing references these tables any more, and none of them was ever populated
-- from the staff sheet or the seed. A material may still be of type
-- ASSESSMENT_LINK or LAB: a training can attach the paper a facilitator hands out,
-- and that is a document like any other. What goes is the marking.
DROP TABLE IF EXISTS "assessment_attempts";
DROP TABLE IF EXISTS "assessment_items";
DROP TABLE IF EXISTS "assessments";
