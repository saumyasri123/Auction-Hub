import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not set, emails will not be sent');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export class EmailService {
  static async sendEmail(to, subject, text, html) {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('Email would be sent:', { to, subject });
      return true;
    }

    try {
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@auctionhub.com',
        subject,
        text,
        html,
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('SendGrid email error:', error.message);
      if (error.response) {
        console.error('SendGrid error response:', error.response.body);
      }
      return false;
    }
  }

  static async sendBidConfirmation(userEmail, auctionTitle, bidAmount) {
    const subject = 'Bid Confirmation - AuctionHub';
    const html = `
      <h2>Bid Placed Successfully</h2>
      <p>Your bid of $${bidAmount} has been placed on "${auctionTitle}".</p>
      <p>You will be notified if you are outbid or if you win the auction.</p>
      <p>Best regards,<br>AuctionHub Team</p>
    `;
    const text = `Your bid of $${bidAmount} has been placed on "${auctionTitle}".`;

    return await this.sendEmail(userEmail, subject, text, html);
  }

  static async sendAuctionWinNotification(userEmail, auctionTitle, winningBid) {
    const subject = 'Congratulations! You won the auction - AuctionHub';
    const html = `
      <h2>Auction Won!</h2>
      <p>Congratulations! You have won the auction for "${auctionTitle}" with a bid of $${winningBid}.</p>
      <p>The seller will review your bid and get back to you soon.</p>
      <p>Best regards,<br>AuctionHub Team</p>
    `;
    const text = `Congratulations! You won "${auctionTitle}" with a bid of $${winningBid}.`;

    return await this.sendEmail(userEmail, subject, text, html);
  }

  static async sendSellerNotification(userEmail, auctionTitle, highestBid) {
    const subject = 'Auction Ended - Awaiting Your Decision - AuctionHub';
    const html = `
      <h2>Auction Ended</h2>
      <p>Your auction for "${auctionTitle}" has ended with a highest bid of $${highestBid}.</p>
      <p>Please log in to your dashboard to accept, reject, or make a counter-offer.</p>
      <p>Best regards,<br>AuctionHub Team</p>
    `;
    const text = `Your auction for "${auctionTitle}" ended with highest bid of $${highestBid}.`;

    return await this.sendEmail(userEmail, subject, text, html);
  }

  static async sendTransactionConfirmation(buyerEmail, sellerEmail, auctionTitle, amount) {
    const subject = 'Transaction Confirmed - AuctionHub';
    const html = `
      <h2>Transaction Confirmed</h2>
      <p>The auction for "${auctionTitle}" has been successfully completed for $${amount}.</p>
      <p>An invoice has been generated and attached to this email.</p>
      <p>Best regards,<br>AuctionHub Team</p>
    `;
    const text = `Transaction confirmed for "${auctionTitle}" - $${amount}`;

    // Send to both buyer and seller
    await this.sendEmail(buyerEmail, subject, text, html);
    await this.sendEmail(sellerEmail, subject, text, html);
  }

  static async sendCounterOfferNotification(buyerEmail, auctionTitle, counterAmount) {
    const subject = 'Counter Offer Received - AuctionHub';
    const html = `
      <h2>Counter Offer</h2>
      <p>The seller has made a counter offer of $${counterAmount} for "${auctionTitle}".</p>
      <p>Please log in to accept or reject this counter offer.</p>
      <p>Best regards,<br>AuctionHub Team</p>
    `;
    const text = `Counter offer of $${counterAmount} received for "${auctionTitle}".`;

    return await this.sendEmail(buyerEmail, subject, text, html);
  }
}
