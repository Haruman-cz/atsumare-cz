import * as admin from 'firebase-admin';
import awsData from '../../src/config/config';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
    const cert = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };

    admin.initializeApp({
        credential: admin.credential.cert(cert),
    });
}

// 通知を送信する関数
export const sendNotification = async (tokens: string[], title: string, body: string) => {
    const message: admin.messaging.MessagingPayload = {
        notification: {
            title,
            body,
        },
    };

    try {
        const response = await admin.messaging().sendToDevice(tokens, message);
        console.log('Notification sent successfully:', response);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

// DynamoDBからトークンを取得して通知を送信する関数
export const sendNotificationsFromDynamoDB = async (title: string, body: string) => {
    // DynamoDBクライアントの初期化
    const dynamoDBClient = new DynamoDBClient({ 
        region: awsData.awsRegion,
        credentials: {
          accessKeyId: awsData.accessKeyId,
          secretAccessKey: awsData.secretAccessKey
        }
    });

    const params = {
        TableName: 'Notification_Token_Table',
        ProjectionExpression: 'notificationToken',
    };

    try {
        const command = new ScanCommand(params);
        const data = await dynamoDBClient.send(command);
        const tokens: string[] = data.Items?.map((item) => item.notificationToken.S ?? '') ?? [];

        // 通知を送信
        await sendNotification(tokens, title, body);
    } catch (error) {
        console.error('Error fetching tokens from DynamoDB:', error);
    }
};
