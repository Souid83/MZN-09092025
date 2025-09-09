import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { FreightSlip, Client, Fournisseur } from '../types';

// Logo temporaire (à remplacer par le vrai logo base64 plus tard)
const LOGO_BASE64 = 'data:image/png;base64,[LOGO]';

const styles = StyleSheet.create({
  page: {
    padding: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 50,
  },
  section: {
    marginBottom: 20,
    padding: 10,
    border: '1px solid #000',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%',
  },
});

const FreightCMRPDF = ({ slip }: { slip: FreightSlip }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={LOGO_BASE64} style={styles.logo} />
        <View>
          <Text>Lettre de voiture CMR</Text>
          <Text>Numéro: {slip.number}</Text>
          <Text>Date chargement: {new Date(slip.loading_date).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.twoColumns}>
        <View style={[styles.section, styles.column]}>
          <Text style={styles.sectionTitle}>Expéditeur</Text>
          <Text>{slip.clients?.nom || 'Non spécifié'}</Text>
          <Text>{slip.loading_address}</Text>
          <Text>Contact: {slip.loading_contact}</Text>
          <Text>Date: {new Date(slip.loading_date).toLocaleDateString()}</Text>
          <Text>Heure: {slip.loading_time}</Text>
        </View>

        <View style={[styles.section, styles.column]}>
          <Text style={styles.sectionTitle}>Destinataire</Text>
          <Text>{slip.fournisseurs?.nom || 'Non spécifié'}</Text>
          <Text>{slip.delivery_address}</Text>
          <Text>Contact: {slip.delivery_contact}</Text>
          <Text>Date: {new Date(slip.delivery_date).toLocaleDateString()}</Text>
          <Text>Heure: {slip.delivery_time}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marchandises</Text>
        <Text>Description: {slip.goods_description}</Text>
        {slip.volume && <Text>Volume: {slip.volume} m³</Text>}
        {slip.weight && <Text>Poids: {slip.weight} kg</Text>}
        <Text>Type de véhicule: {slip.vehicle_type}</Text>
        <Text>Mode d'échange: {slip.exchange_type}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text>{slip.instructions}</Text>
        {slip.observations && (
          <>
            <Text style={{marginTop: 5}}>Observations:</Text>
            <Text>{slip.observations}</Text>
          </>
        )}
      </View>

      <View style={styles.twoColumns}>
        <View style={[styles.section, styles.column]}>
          <Text style={styles.sectionTitle}>Transporteur</Text>
          <Text>MZM Transport</Text>
          <Text>Prix: {slip.price} €</Text>
          <Text>Méthode de paiement: {slip.payment_method}</Text>
        </View>

        <View style={[styles.section, styles.column]}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          <View style={{height: 40, marginBottom: 10}}>
            <Text>Signature expéditeur:</Text>
          </View>
          <View style={{height: 40}}>
            <Text>Signature transporteur:</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

export default FreightCMRPDF;
