-- Add metadata column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create email_templates setting if it doesn't exist
INSERT INTO settings (type, config)
VALUES (
  'email_templates', 
  '{
    "templates": {
      "transport": "Bonjour {{nom_client}},\n\nVeuillez trouver ci-joint le bordereau de transport n°{{numero_bordereau}} pour votre livraison prévue le {{date}}.\n\nN''hésitez pas à nous contacter pour toute question.\n\n{{signature}}",
      "freight": "Bonjour {{nom_client}},\n\nVeuillez trouver ci-joint la confirmation d''affrètement n°{{numero_bordereau}} pour votre transport prévu le {{date}}.\n\nN''hésitez pas à nous contacter pour toute question.\n\n{{signature}}",
      "invoice": "Bonjour {{nom_client}},\n\nVeuillez trouver ci-joint la facture n°{{numero_facture}} d''un montant de {{montant_ttc}}€ TTC.\n\nNous vous remercions pour votre confiance.\n\n{{signature}}"
    }
  }'::jsonb
)
ON CONFLICT (type) DO NOTHING;