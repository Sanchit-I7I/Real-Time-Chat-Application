const Message = require('../models/Message');
const User = require('../models/User');
const { getLLMResponse } = require('../utils/llmIntegration');

exports.sendMessage = async (req, res) => {
    const { recipientId, message } = req.body;
    try {
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ msg: 'Recipient not found' });
        }
        if (recipient.status === 'BUSY') {
            const prompt = message;
            let responseMessage;
            try {
                const llmResponse = await getLLMResponse(prompt);
                responseMessage = llmResponse;
            } catch {
                responseMessage = 'User is currently busy. Please try again later.';
            }
            const messageObj = new Message({ sender: req.user.id, recipient: recipientId, message: responseMessage });
            await messageObj.save();
            return res.json(messageObj);
        }
        const messageObj = new Message({ sender: req.user.id, recipient: recipientId, message });
        await messageObj.save();
        res.json(messageObj);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, recipient: req.params.userId },
                { sender: req.params.userId, recipient: req.user.id }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
