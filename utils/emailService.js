const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOrderConfirmation = async (order) => {
    const { employeeDetails, items, shippingAddress } = order;
    
    // Format items into a styled list
    const itemsList = items.map(item => `<li style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500;">✓ ${item.title}</li>`).join('');

    const baseStyle = `font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;`;
    const headerStyle = `background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 30px 20px; text-align: center; border-bottom: 4px solid #f97316;`;
    const contentStyle = `padding: 40px 30px; color: #475569; line-height: 1.6;`;
    const titleStyle = `color: #0f172a; font-size: 24px; font-weight: 700; margin-bottom: 20px; text-align: center;`;
    const sectionStyle = `background-color: #f8fafc; border-left: 4px solid #f97316; padding: 20px; border-radius: 0 8px 8px 0; margin: 25px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);`;
    const footerStyle = `background-color: #f1f5f9; padding: 30px 20px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;`;
    const labelStyle = `font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 5px;`;
    const valueStyle = `font-size: 16px; color: #0f172a; font-weight: 500; margin: 0;`;

    // Reusable Header & Footer Components
    const headerHtml = `
        <div style="${headerStyle}">
            <img src="cid:tigerlogo" alt="Tiger Analytics" style="max-height: 55px; width: auto; margin-bottom: 10px;">
        </div>
    `;

    const footerHtml = `
        <div style="${footerStyle}">
            <p style="margin: 0 0 15px 0;">Official Onboarding Portal • Tiger Analytics</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #cbd5e1; display: inline-block;">
                <span style="display: inline-block; vertical-align: middle; font-weight: 500;">Powered by</span>
                <img src="cid:printonelogo" alt="Printone" style="max-height: 28px; width: auto; vertical-align: middle; margin-left: 8px;">
            </div>
        </div>
    `;

    // 1. Employee Email Content
    const employeeHtml = `
        <div style="background-color: #f4f4f5; padding: 40px 20px;">
            <div style="${baseStyle}">
                ${headerHtml}
                <div style="${contentStyle}">
                    <h2 style="${titleStyle}">Welcome to the Tiger Analytics! 🚀</h2>
                    <p style="font-size: 16px;">Hello <strong style="color: #0f172a;">${employeeDetails.name}</strong>,</p>
                    <p style="font-size: 16px;">Congratulations! Your welcome kit selection has been confirmed. Our team is now preparing your personalized gear for dispatch.</p>
                    
                    <div style="${sectionStyle}">
                        <span style="${labelStyle}">Your Selection</span>
                        <ul style="list-style: none; padding: 0; margin: 10px 0 0 0;">${itemsList}</ul>
                    </div>
                    
                    <p style="font-size: 16px;">We'll send you another update as soon as your package is on its way to you.</p>
                </div>
                ${footerHtml}
            </div>
        </div>
    `;

    // 2. Printone Admin Email Content
    const printoneHtml = `
        <div style="background-color: #f4f4f5; padding: 40px 20px;">
            <div style="${baseStyle}">
                ${headerHtml}
                <div style="${contentStyle}">
                    <h2 style="${titleStyle}">New Kit Order Received 📦</h2>
                    <p style="font-size: 16px;">A new onboarding kit selection requires processing.</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr; gap: 20px;">
                        <div style="${sectionStyle}; margin-top: 20px; margin-bottom: 0;">
                            <span style="${labelStyle}">Employee Details</span>
                            <div style="margin-bottom: 10px;">
                                <p style="${valueStyle}">${employeeDetails.name}</p>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <p style="${valueStyle}">${employeeDetails.email}</p>
                            </div>
                            <div>
                                <p style="${valueStyle}">${employeeDetails.phone}</p>
                            </div>
                        </div>

                        <div style="${sectionStyle}; margin-top: 20px; margin-bottom: 0;">
                            <span style="${labelStyle}">Shipping Details</span>
                            <p style="${valueStyle}">${shippingAddress.address}</p>
                            <p style="${valueStyle}">${shippingAddress.city} - ${shippingAddress.pincode}</p>
                        </div>
                    </div>
                    
                    <div style="${sectionStyle}">
                        <span style="${labelStyle}">Order Items</span>
                        <ul style="list-style: none; padding: 0; margin: 10px 0 0 0;">${itemsList}</ul>
                    </div>
                </div>
                ${footerHtml}
            </div>
        </div>
    `;

    // 3. Tiger Admin Email Content
    const tigerHtml = `
        <div style="background-color: #f4f4f5; padding: 40px 20px;">
            <div style="${baseStyle}">
                ${headerHtml}
                <div style="${contentStyle}">
                    <h2 style="${titleStyle}">Selection Completed ✅</h2>
                    <p style="font-size: 16px;">Employee <strong style="color: #0f172a;">${employeeDetails.name}</strong> has successfully completed their onboarding kit selection.</p>
                    
                    <div style="${sectionStyle}">
                        <div style="margin-bottom: 15px;">
                            <span style="${labelStyle}">Employee Email</span>
                            <p style="${valueStyle}">${employeeDetails.email}</p>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <span style="${labelStyle}">Status</span>
                            <p style="${valueStyle}; color: #16a34a;">Ready for Dispatch</p>
                        </div>
                        <div>
                            <span style="${labelStyle}">Selected Bundle</span>
                            <p style="${valueStyle}">${items.length} Items Selected</p>
                        </div>
                    </div>

                    <div style="${sectionStyle}">
                        <span style="${labelStyle}">Order Items</span>
                        <ul style="list-style: none; padding: 0; margin: 10px 0 0 0;">${itemsList}</ul>
                    </div>
                    
                    <p style="font-size: 15px; color: #64748b; font-style: italic;">No further action is required from HR at this time.</p>
                </div>
                ${footerHtml}
            </div>
        </div>
    `;

    const attachments = [
        {
            filename: 'tiger.svg',
            path: path.join(__dirname, '../../frontend/public/tiger.svg'),
            cid: 'tigerlogo'
        },
        {
            filename: 'printone-logo.png',
            path: path.join(__dirname, '../../frontend/public/printone-logo.png'),
            cid: 'printonelogo'
        }
    ];

    try {
        // Send Employee Confirmation
        await transporter.sendMail({
            from: '"Tiger Tribe" <' + process.env.EMAIL_USER + '>',
            to: employeeDetails.email,
            subject: "Welcome to the Tribe! Your Gear is on the way",
            html: employeeHtml,
            attachments
        });

        // Send Printone Admin Notification
        await transporter.sendMail({
            from: '"Order Portal" <' + process.env.EMAIL_USER + '>',
            to: process.env.ADMIN_EMAIL_PRINTONE,
            subject: `NEW ORDER: ${employeeDetails.name} - Action Required`,
            html: printoneHtml,
            attachments
        });

        // Send Tiger Admin Notification
        await transporter.sendMail({
            from: '"Onboarding Update" <' + process.env.EMAIL_USER + '>',
            to: process.env.ADMIN_EMAIL_TIGER,
            subject: `Onboarding Update: ${employeeDetails.name} - Selection Complete`,
            html: tigerHtml,
            attachments
        });

        console.log('✅ All specialized emails sent successfully');
    } catch (error) {
        console.error('❌ Error sending role-based emails:', error);
    }
};

module.exports = { sendOrderConfirmation };
