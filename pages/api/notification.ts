import type { NextApiRequest, NextApiResponse } from 'next';
import awsData from '../../src/config/config';
import {
    DynamoDBClient,
    PutItemCommand,
} from '@aws-sdk/client-dynamodb';

const NOTIFICATION_TABLE_NAME = 'Notification_Token_Table';
const client = new DynamoDBClient({ region: awsData.awsRegion });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method == 'POST') {
        if (req.body['key01'] == 'SETNOTIFICATIONTOKEN') {
            const { userId, NotificationToken } = req.body;
        
            if (!userId || !NotificationToken) {
                return res.status(400).json({ message: 'Missing userId or NotificationToken' });
            }
        
            const params = {
                TableName: NOTIFICATION_TABLE_NAME,
                Item: {
                    userId: { S: userId },
                    notificationToken: { S: NotificationToken },
                },
            };
            
            try {
                const command = new PutItemCommand(params);
                await client.send(command);
                res.status(200).json({ message: 'Token saved successfully' });
            } catch (error) {
                console.error('Error saving token to DynamoDB:', error);
                res.status(500).json({ error: 'Failed to save token' });
            }
        }
    }
}