/*
  # Ajouter colonne supplier_invoice_status_initialized

  1. Modifications de table
    - Ajouter la colonne `supplier_invoice_status_initialized` à la table `freight_slips`
    - Type: boolean avec valeur par défaut `false`
    - Cette colonne indique si le statut de la facture fournisseur a été explicitement défini

  2. Objectif
    - Permettre de distinguer un bordereau nouvellement créé (statut à renseigner)
    - D'un bordereau dont le statut a été explicitement défini comme "Non reçu"
    - Résoudre l'ambiguïté entre les valeurs par défaut et les choix utilisateur
*/

-- Ajouter la nouvelle colonne pour tracker si le statut a été initialisé
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'freight_slips' AND column_name = 'supplier_invoice_status_initialized'
  ) THEN
    ALTER TABLE freight_slips ADD COLUMN supplier_invoice_status_initialized boolean DEFAULT false NOT NULL;
  END IF;
END $$;