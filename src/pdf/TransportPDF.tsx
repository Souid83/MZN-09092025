import React from 'react';
import { Document, Page, Text } from '@react-pdf/renderer';
import type { TransportSlip } from '../types';

interface TransportPDFProps {
  slip: TransportSlip;
}

export const TransportPDF: React.FC<TransportPDFProps> = ({ slip }) => {
  return (
    <Document>
      <Page size="A4">
        <Text>{slip.transporteur}</Text>
      </Page>
    </Document>
  );
};

export default TransportPDF;