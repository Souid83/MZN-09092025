import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FreightSlip } from '../types';

// Register fonts
Font.register({
  family: 'Arial',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/arial@1.0.4/Arial.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/arial-bold@1.0.4/Arial-Bold.ttf', fontWeight: 'bold' }
  ]
});

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Arial',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#333'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  logo: {
    width: 100,
    height: 70
  },
  headerRight: {
    width: '40%',
    fontSize: 8,
    textAlign: 'right'
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  reference: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3
  },
  column: {
    width: '50%'
  },
  label: {
    fontWeight: 'bold',
    marginRight: 5
  },
  value: {
    flex: 1
  },
  goodsInfo: {
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 3
  },
  priceInfo: {
    marginTop: 15,
    marginBottom: 15
  },
  instructions: {
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f5f5f5'
  },
  warning: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  legalText: {
    fontSize: 7,
    marginBottom: 5
  },
  signature: {
    position: 'absolute',
    right: 40,
    top: 600,
    width: 150,
    textAlign: 'center'
  },
  signatureTitle: {
    fontWeight: 'bold',
    marginBottom: 5
  },
  signatureText: {
    marginBottom: 30
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8
  },
  contacts: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    fontSize: 8
  }
});

interface FreightPDFProps {
  slip: FreightSlip;
}

export const FreightPDF = ({ slip }: FreightPDFProps) => {
  const formattedLoadingDate = format(new Date(slip.loading_date), 'dd/MM/yyyy', { locale: fr });
  const formattedDeliveryDate = format(new Date(slip.delivery_date), 'dd/MM/yyyy', { locale: fr });
  
  // Parse addresses
  const loadingAddressParts = slip.loading_address.split(',').map(p => p.trim());
  const deliveryAddressParts = slip.delivery_address.split(',').map(p => p.trim());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {/* Logo would go here */}
            <Text style={{ fontWeight: 'bold', fontSize: 14 }}>MZN TRANSPORT</Text>
          </View>
          <View style={styles.headerRight}>
            <Text>12 RUE DES AIRES</Text>
            <Text>34430 SAINT JEAN DE VEDAS</Text>
            <Text>SIRET: 48911875672</Text>
            <Text>TVA: FR12345678900</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.title}>
          <Text>CONFIRMATION D'AFFRETEMENT</Text>
        </View>

        {/* Reference */}
        <View style={styles.reference}>
          <Text>Référence: {slip.number}</Text>
          <Text>Date: {formattedLoadingDate}</Text>
        </View>

        {/* Client and Transporter */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Client:</Text>
            <Text>{slip.clients?.nom || ''}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Transporteur:</Text>
            <Text>{slip.fournisseurs?.nom || ''}</Text>
            <Text>{slip.fournisseurs?.telephone || ''}</Text>
          </View>
        </View>

        {/* Loading and Delivery */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Chargement:</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Date:</Text>
                <Text>{formattedLoadingDate}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Heure:</Text>
                <Text>{slip.loading_time}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Adresse:</Text>
                <Text>{loadingAddressParts[0]}</Text>
              </View>
              {loadingAddressParts.length > 1 && (
                <Text>{loadingAddressParts.slice(1).join(', ')}</Text>
              )}
              <View style={styles.row}>
                <Text style={styles.label}>Contact:</Text>
                <Text>{slip.loading_contact}</Text>
              </View>
            </View>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Livraison:</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Date:</Text>
                <Text>{formattedDeliveryDate}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Heure:</Text>
                <Text>{slip.delivery_time}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Adresse:</Text>
                <Text>{deliveryAddressParts[0]}</Text>
              </View>
              {deliveryAddressParts.length > 1 && (
                <Text>{deliveryAddressParts.slice(1).join(', ')}</Text>
              )}
              <View style={styles.row}>
                <Text style={styles.label}>Contact:</Text>
                <Text>{slip.delivery_contact}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Goods Information */}
        <View style={styles.goodsInfo}>
          <Text style={styles.sectionTitle}>Marchandise:</Text>
          <Text>{slip.goods_description}</Text>
          
          <View style={[styles.row, { marginTop: 10 }]}>
            <View style={{ width: '33%' }}>
              <Text style={styles.label}>Volume: {slip.volume || '-'} m³</Text>
            </View>
            <View style={{ width: '33%' }}>
              <Text style={styles.label}>Poids: {slip.weight || '-'} kg</Text>
            </View>
            <View style={{ width: '33%' }}>
              <Text style={styles.label}>Type de véhicule: {slip.vehicle_type}</Text>
            </View>
          </View>
        </View>

        {/* Price Information */}
        <View style={styles.priceInfo}>
          <Text style={styles.sectionTitle}>Prix de transport:</Text>
          <Text>{slip.price} € HT *taxe gasoil inclus*</Text>
          <Text>Mode de règlement: {slip.payment_method}</Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.sectionTitle}>Consignes:</Text>
          <Text>BIEN ARRIMER LA MARCHANDISE</Text>
          <Text>PRISE DE PHOTO IMPERATIVE AU CHARGEMENT ET DECHARGEMENT</Text>
          {slip.observations && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Observations:</Text>
              <Text>{slip.observations}</Text>
            </>
          )}
        </View>

        {/* Warning */}
        <Text style={styles.warning}>
          IL EST FORMELLEMENT INTERDIT DE MONTRER CETTE COMMANDE A L'EXPEDITEUR ET AU DESTINATAIRE
        </Text>

        {/* Legal Mentions */}
        <View>
          <Text style={styles.legalText}>
            En cas de problème ou retard survenant lors du transport ou des opérations de chargement et déchargement, 
            nous contacter impérativement afin d'en informer nos clients dans les meilleurs délais.
          </Text>
          <Text style={styles.legalText}>
            - Les documents de transport émargés doivent impérativement nous parvenir avec la facture.
          </Text>
          <Text style={styles.legalText}>
            - Tout réaffrètement est formellement interdit sauf autorisation expresse et préalable de notre part.
          </Text>
          <Text style={styles.legalText}>
            - Les instructions de ce fax doivent être suivies dans le strict respect de le règlementation sociale 
            (Temps de conduite et de repos) et routière (Limitation de vitesse).
          </Text>
        </View>

        {/* Signature */}
        <View style={styles.signature}>
          <Text style={styles.signatureTitle}>BON POUR ACCORD</Text>
          <Text style={styles.signatureText}>Date et cachet commercial</Text>
        </View>

        {/* Contacts */}
        <View style={styles.contacts}>
          <Text style={{ fontWeight: 'bold' }}>NOS CONTACTS:</Text>
          <Text>Eliot : 07 81 30 59 87 Commerce / exploitation : exploitation@mzntransport.fr</Text>
          <Text>Orlane : 07 81 65 49 21 Assistance direction : contact@mzntransport.fr</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>MZN TRANSPORT - 12 RUE DES AIRES 34430 SAINT JEAN DE VEDAS</Text>
          <Text>SIRET: 48911875672 - TVA: FR12345678900</Text>
        </View>
      </Page>
    </Document>
  );
};