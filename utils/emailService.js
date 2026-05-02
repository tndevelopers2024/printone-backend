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

const sendStatusUpdateEmail = async (order) => {
    const { employeeDetails, status, items } = order;
    
    const itemsList = items.map(item => `<li style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500;">✓ ${item.title}</li>`).join('');

    const baseStyle = `font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;`;
    const headerStyle = `background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 30px 20px; text-align: center; border-bottom: 4px solid #3b82f6;`;
    const contentStyle = `padding: 40px 30px; color: #475569; line-height: 1.6;`;
    const titleStyle = `color: #0f172a; font-size: 24px; font-weight: 700; margin-bottom: 20px; text-align: center;`;
    const sectionStyle = `background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 0 8px 8px 0; margin: 25px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);`;
    const footerStyle = `background-color: #f1f5f9; padding: 30px 20px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;`;

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

    const html = `
        <div style="background-color: #f4f4f5; padding: 40px 20px;">
            <div style="${baseStyle}">
                ${headerHtml}
                <div style="${contentStyle}">
                    <h2 style="${titleStyle}">Order Progress Update</h2>
                    <p style="font-size: 16px;">Hello <strong style="color: #0f172a;">${employeeDetails.name}</strong>,</p>
                    <p style="font-size: 16px;">We are pleased to inform you that your onboarding kit order is now being <strong>${status}</strong>.</p>
                    
                    <div style="${sectionStyle}">
                        <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 14px;">Items being prepared:</p>
                        <ul style="list-style: none; padding: 0; margin: 10px 0 0 0;">${itemsList}</ul>
                    </div>
                    
                    <p style="font-size: 16px;">You will receive another notification once your package is dispatched.</p>
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
        // Send to Employee
        await transporter.sendMail({
            from: '"Tiger Tribe" <' + process.env.EMAIL_USER + '>',
            to: employeeDetails.email,
            subject: `Order Update: Your gear is now being processed!`,
            html: html,
            attachments
        });

        // Send to Tiger Admin (Analytics)
        await transporter.sendMail({
            from: '"Order Portal" <' + process.env.EMAIL_USER + '>',
            to: process.env.ADMIN_EMAIL_TIGER,
            subject: `Processing Update: ${employeeDetails.name}`,
            html: html,
            attachments
        });

        console.log('✅ Status update emails sent successfully');
    } catch (error) {
        console.error('❌ Error sending status update emails:', error);
    }
};

const sendDispatchEmail = async (order) => {
    const { employeeDetails, status, items, trackingLink } = order;
    
    const itemsList = items.map(item => `<li style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500;">✓ ${item.title}</li>`).join('');

    const baseStyle = `font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;`;
    const headerStyle = `background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 30px 20px; text-align: center; border-bottom: 4px solid #f97316;`;
    const contentStyle = `padding: 40px 30px; color: #475569; line-height: 1.6;`;
    const titleStyle = `color: #0f172a; font-size: 24px; font-weight: 700; margin-bottom: 20px; text-align: center;`;
    const sectionStyle = `background-color: #f8fafc; border-left: 4px solid #f97316; padding: 20px; border-radius: 0 8px 8px 0; margin: 25px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);`;
    const footerStyle = `background-color: #f1f5f9; padding: 30px 20px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;`;

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

    const html = `
        <div style="background-color: #f4f4f5; padding: 40px 20px;">
            <div style="${baseStyle}">
                ${headerHtml}
                <div style="${contentStyle}">
                    <h2 style="${titleStyle}">Your Gear is on the Way!</h2>
                    <p style="font-size: 16px;">Hello <strong style="color: #0f172a;">${employeeDetails.name}</strong>,</p>
                    <p style="font-size: 16px;">Great news! Your onboarding kit has been <strong>${status}</strong> and is currently in transit.</p>
                    
                    ${trackingLink ? `
                    <div style="margin: 30px 0; text-align: center;">
                        <p style="font-size: 14px; color: #64748b; margin-bottom: 12px;">TRACK YOUR PACKAGE</p>
                        <a href="${trackingLink}" style="background-color: #f97316; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);">View Delivery Status</a>
                        <p style="font-size: 12px; color: #94a3b8; margin-top: 12px;">Link: ${trackingLink}</p>
                    </div>
                    ` : ''}

                    <div style="${sectionStyle}">
                        <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 14px;">Items Dispatched:</p>
                        <ul style="list-style: none; padding: 0; margin: 10px 0 0 0;">${itemsList}</ul>
                    </div>
                    
                    <p style="font-size: 16px;">We hope you enjoy your new Tiger gear! Feel free to reach out if you have any questions.</p>
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
        // Send to Employee
        await transporter.sendMail({
            from: '"Tiger Tribe" <' + process.env.EMAIL_USER + '>',
            to: employeeDetails.email,
            subject: `Dispatch Update: Your gear is on the way!`,
            html: html,
            attachments
        });

        // Send to Tiger Admin (Analytics)
        await transporter.sendMail({
            from: '"Order Portal" <' + process.env.EMAIL_USER + '>',
            to: process.env.ADMIN_EMAIL_TIGER,
            subject: `Dispatch Update: ${employeeDetails.name}`,
            html: html,
            attachments
        });

        console.log('✅ Dispatch update emails sent successfully');
    } catch (error) {
        console.error('❌ Error sending dispatch update emails:', error);
    }
};

const sendDeliveryConfirmationRequestEmail = async (order) => {
    const { employeeDetails, _id } = order;
    
    const baseStyle = `font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;`;
    const headerStyle = `background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 40px 20px; text-align: center; border-bottom: 4px solid #f97316;`;
    const contentStyle = `padding: 50px 40px; color: #334155; line-height: 1.8;`;
    const titleStyle = `color: #0f172a; font-size: 26px; font-weight: 800; margin-bottom: 24px; text-align: center; letter-spacing: -0.02em;`;
    const footerStyle = `background-color: #f8fafc; padding: 30px 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9;`;
    const btnBase = `display: inline-block; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; transition: all 0.3s; margin: 10px 5px;`;
    
    const apiBase = `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/orders/public-confirm/${_id}`;

    const html = `
        <div style="background-color: #f1f5f9; padding: 60px 20px;">
            <div style="${baseStyle}">
                <div style="${headerStyle}">
                    <img src="cid:tigerlogo" alt="Tiger Analytics" style="max-height: 50px; width: auto;">
                </div>
                <div style="${contentStyle}">
                    <h2 style="${titleStyle}">Did you receive your kit? 📦</h2>
                    <p style="font-size: 16px; margin-bottom: 30px; text-align: center;">Hello <strong>${employeeDetails.name}</strong>, it's been a week since your onboarding kit was dispatched. We want to ensure everything reached you safely.</p>
                    
                    <div style="text-align: center; margin-top: 40px;">
                        <a href="${apiBase}/yes" style="${btnBase} background-color: #16a34a; color: #ffffff; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.25);">Yes, I received it</a>
                        <a href="${apiBase}/no" style="${btnBase} background-color: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">No, not yet</a>
                    </div>
                </div>
                <div style="${footerStyle}">
                    <p style="margin: 0;">Official Onboarding Portal • Powered by Printone</p>
                </div>
            </div>
        </div>
    `;

    const attachments = [
        {
            filename: 'tiger.svg',
            path: path.join(__dirname, '../../frontend/public/tiger.svg'),
            cid: 'tigerlogo'
        }
    ];

    try {
        await transporter.sendMail({
            from: '"Tiger Tribe Support" <' + process.env.EMAIL_USER + '>',
            to: employeeDetails.email,
            subject: "Quick Check: Has your onboarding kit arrived?",
            html: html,
            attachments
        });
        console.log(`✅ Follow-up email sent to ${employeeDetails.email}`);
    } catch (error) {
        console.error('❌ Error sending follow-up email:', error);
    }
};

const sendNonReceiptNotificationToAdmin = async (order) => {
    const { employeeDetails, items, _id } = order;
    const adminEmails = [process.env.ADMIN_EMAIL_PRINTONE, process.env.ADMIN_EMAIL_TIGER].filter(Boolean);
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin`;

    const itemsList = items.map(item => 
        `<li style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155;">
            <strong style="color: #0f172a;">${item.title}</strong> ${item.selectedSize ? `<span style="color: #f97316; font-weight: 700;">(Size: ${item.selectedSize})</span>` : ''}
        </li>`
    ).join('');

    const html = `
        <div style="background-color: #fff1f2; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(225, 29, 72, 0.1); border: 1px solid #fecdd3;">
                <!-- Red Alert Header -->
                <div style="background-color: #e11d48; padding: 40px 30px; text-align: center;">
                    <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 6px 12px; border-radius: 8px; margin-bottom: 20px;">
                        <span style="color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Action Required</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">Non-Receipt Reported</h1>
                </div>

                <!-- Main Content -->
                <div style="padding: 40px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="width: 60px; height: 60px; background: #fff1f2; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                            <span style="font-size: 30px;">⚠️</span>
                        </div>
                        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0;">
                            Employee <strong style="color: #0f172a;">${employeeDetails.name}</strong> has reported that they have <span style="color: #e11d48; font-weight: 800;">NOT RECEIVED</span> their kit after the expected 7-day window.
                        </p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 16px; padding: 25px; margin-bottom: 30px; border: 1px solid #e2e8f0;">
                        <h3 style="margin: 0 0 15px 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-weight: 800;">Shipment Context</h3>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #64748b; font-size: 13px;">Order ID</span>
                            <span style="color: #0f172a; font-size: 13px; font-weight: 700;">#${_id.toString().toUpperCase()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748b; font-size: 13px;">Recipient</span>
                            <span style="color: #0f172a; font-size: 13px; font-weight: 700;">${employeeDetails.email}</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 40px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-weight: 800;">Unreceived Items</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; border-top: 1px solid #f1f5f9;">
                            ${itemsList}
                        </ul>
                    </div>

                    <div style="text-align: center;">
                        <a href="${dashboardUrl}" style="background-color: #0f172a; color: #ffffff; padding: 18px 36px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; display: inline-block; transition: all 0.3s ease; box-shadow: 0 10px 20px rgba(15, 23, 42, 0.2);">View in Dashboard</a>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; font-weight: 500;">Please verify with the courier partner immediately.</p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #f1f5f9;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 700;">Official Alert System • Tiger Analytics</p>
                </div>
            </div>
        </div>
    `;

    const mailOptions = {
        from: `"Printone Alerts" <${process.env.EMAIL_USER}>`,
        to: adminEmails.join(','),
        subject: `🚨 URGENT: Non-Receipt Reported - ${employeeDetails.name}`,
        html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('🚨 Admin non-receipt alert sent successfully');
    } catch (error) {
        console.error('Error sending admin alert:', error);
        throw error;
    }
};

module.exports = { 
    sendOrderConfirmation, 
    sendStatusUpdateEmail, 
    sendDispatchEmail,
    sendDeliveryConfirmationRequestEmail,
    sendNonReceiptNotificationToAdmin
};
