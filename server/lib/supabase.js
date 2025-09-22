/**
 * Ce module ne doit plus instancier le client Supabase.
 * Le client Supabase doit être créé après l’appel à dotenv.config() dans server/index.js.
 * Importez-le depuis server/index.js ou passez-le en paramètre aux routeurs.
 */
