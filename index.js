const functions = require('@google-cloud/functions-framework');
const nodemailer = require('nodemailer');
const cors = require('cors')({origin: true});

functions.http('valentineResponse', (req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { response, timestamp } = req.body;

        if (!response) {
            res.status(400).send('Missing response');
            return;
        }

        console.log(`Received Proposal Response: ${response} at ${timestamp}`);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.NOTIFICATION_EMAIL,
            subject: `❤️ SHE SAID ${response.toUpperCase()}! - Dino Valentine`,
            text: `Big news!\n\nRachel clicked "${response}" on the Dino Valentine game.\n\nTime: ${timestamp}\n\nCongrats/Condolences!`,
            html: `<h1>SHE SAID ${response.toUpperCase()}!</h1>
                   <p>Rachel just finished the game and clicked the button.</p>
                   <p><strong>Time:</strong> ${timestamp}</p>
                   <p>${response === 'Yes' ? '🎉 Time to celebrate!' : '😢 Check in on her...'}</p>`
        };

        try {
            await transporter.sendMail(mailOptions);
            res.status(200).send({ message: 'Notification sent successfully!' });
        } catch (error) {
            console.error('Error sending email:', error);
            res.status(500).send({ error: 'Failed to send notification' });
        }
    });
});
