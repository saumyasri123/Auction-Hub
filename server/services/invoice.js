import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export class InvoiceService {
  static async generateInvoice(auction, buyer, seller, amount) {
    const invoicesDir = path.join(process.cwd(), 'server', 'invoices');
    
    // Ensure invoices directory exists
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const filename = `invoice-${auction.id}-${Date.now()}.pdf`;
    const filePath = path.join(invoicesDir, filename);

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(24).text('AuctionHub Invoice', 50, 50);
    doc.fontSize(12).text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 100);
    doc.text(`Invoice #: ${auction.id}`, 50, 115);

    // Auction Details
    doc.fontSize(16).text('Auction Details', 50, 150);
    doc.fontSize(12);
    doc.text(`Item: ${auction.itemName}`, 50, 175);
    doc.text(`Description: ${auction.description}`, 50, 190);
    doc.text(`Starting Price: $${auction.startingPrice}`, 50, 205);

    // Buyer Information
    doc.fontSize(16).text('Buyer Information', 50, 240);
    doc.fontSize(12);
    doc.text(`Name: ${buyer.name}`, 50, 265);
    doc.text(`Email: ${buyer.email}`, 50, 280);

    // Seller Information
    doc.fontSize(16).text('Seller Information', 300, 240);
    doc.fontSize(12);
    doc.text(`Name: ${seller.name}`, 300, 265);
    doc.text(`Email: ${seller.email}`, 300, 280);

    // Transaction Details
    doc.fontSize(16).text('Transaction Details', 50, 320);
    doc.fontSize(12);
    doc.text(`Final Bid Amount: $${amount}`, 50, 345);
    doc.text(`Transaction Date: ${new Date().toLocaleDateString()}`, 50, 360);

    // Total
    doc.fontSize(16).text(`Total Amount: $${amount}`, 50, 400);

    // Footer
    doc.fontSize(10).text('Thank you for using AuctionHub!', 50, 500);
    doc.text('This is a computer-generated invoice.', 50, 515);

    doc.end();

    // Wait for the PDF to be written
    await new Promise((resolve) => {
      stream.on('finish', resolve);
    });

    return `/api/invoices/${filename}`;
  }
}
