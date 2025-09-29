// utils/pdfGenerator.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateReceiptPDF = (data, withWatermark, watermarkBase64) => {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add watermark if requested
  if (withWatermark && watermarkBase64) {
    doc.addImage(watermarkBase64, 'JPEG', 0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight());
  }

  // Set document properties
  doc.setProperties({
    title: `Transaction Receipt - ${data.transactionId}`,
    subject: 'Transaction Receipt',
    author: '',
    creator: '',
  });

  // Add title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Receipt', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

  // Add sender section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  
  // Set table styling
  const tableStyles = {
    headStyles: { 
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    bodyStyles: { 
      fontSize: 10 
    },
    alternateRowStyles: { 
      fillColor: [245, 245, 245] 
    }
  };

  

  // Beneficiary Details Section
  doc.setFontSize(14);
  doc.text('Beneficiary Details', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });

  let beneficiaryHead;
  let beneficiaryBody;

  if (data.transferType === 'UPI') {
    beneficiaryHead = [['Name', 'UPI ID']];
    beneficiaryBody = [[data.beneficiaryName, data.accountNo]];
  } else {
    beneficiaryHead = [['Name', 'IFSC Code', 'Account No.']];
    beneficiaryBody = [[data.beneficiaryName, data.ifscCode, data.accountNo]];
  }

  doc.autoTable({
    startY: 30,
    head: beneficiaryHead,
    body: beneficiaryBody,
    ...tableStyles,
    margin: { left: 15, right: 15 },
  });

  // Add additional beneficiary info
  doc.autoTable({
    startY: doc.autoTable.previous.finalY,
    head: [['Transfer Type', 'Service Type']],
    body: [[data.transferType, data.serviceType]],
    ...tableStyles,
    margin: { left: 15, right: 15 },
  });

  // Transaction Details Section
  doc.setFontSize(14);
  doc.text('Transaction Details', doc.internal.pageSize.getWidth() / 2, doc.autoTable.previous.finalY + 10, { align: 'center' });

  doc.autoTable({
    startY: doc.autoTable.previous.finalY + 15,
    head: [['Transaction Time', 'Transaction Id', 'RRN No.', 'Order Id.']],
    body: [[`${data.transactionDate} ${data.transactionTime}`, data.transactionId, data.rrnNo, data.orderId]],
    ...tableStyles,
    margin: { left: 15, right: 15 },
  });

  // Add payment details
  doc.autoTable({
    startY: doc.autoTable.previous.finalY,
    head: [['Payout Purpose', 'Amount Remitted', 'Transaction Status']],
    body: [[data.payoutPurpose, data.amountRemitted, data.transactionStatus]],
    ...tableStyles,
    margin: { left: 15, right: 15 },
  });

  // Add footer
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('This is an electronically generated receipt and does not require a signature.', 
    doc.internal.pageSize.getWidth() / 2, 
    doc.autoTable.previous.finalY + 15, 
    { align: 'center' });

  // Company information
  // doc.setFontSize(10);
  // doc.setFont('helvetica', 'normal');
  // doc.text('VishubhIT Solution Private Limited', 
  //   doc.internal.pageSize.getWidth() / 2, 
  //   doc.internal.pageSize.getHeight() - 20, 
  //   { align: 'center' });
  // doc.text('Phone: 9001770984 | Email: support@vishubhit.com', 
  //   doc.internal.pageSize.getWidth() / 2, 
  //   doc.internal.pageSize.getHeight() - 15, 
  //   { align: 'center' });

  // Save the PDF
  doc.save(`Receipt_${data.transactionId}.pdf`);
};