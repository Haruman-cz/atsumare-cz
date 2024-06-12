import * as admin from 'firebase-admin';
import awsData from '../../src/config/config';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

// Firebase Admin SDKの初期化
if (admin.apps.length == 0) {
    try {
        const cert = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        };

        admin.initializeApp({
            credential: admin.credential.cert(cert),
        });

        console.log('初期化はうまくいっているはずです。');
    } catch (error) {
        console.log(process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"));
        console.error('Error Firebase Admin SDKの初期化:', error);
    }
}

// 通知を送信する関数
export const sendNotification = async (tokens: string[], title: string, body: string) => {
    console.log('ここは通知を送るところです。')
    
    for (const token of tokens) {
        const message: admin.messaging.Message = {
            token: token,
            notification: {
                title,
                body,
            },
        };

        try {
            const response = await admin.messaging().send(message);
            console.log('Notification sent successfully to', token, ':', response);
        } catch (error) {
            console.error('Error sending notification to', token, ':', error);
        }
    }
};

// DynamoDBからトークンを取得して通知を送信する関数
export const sendNotificationsFromDynamoDB = async (title: string, body: string) => {

    console.log('全員に通知を送る関数が呼ばれました。', title, body);

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

        console.log('通知を送る人のリストです', data);
        
        const tokens: string[] = data.Items?.map((item) => item.notificationToken.S ?? '') ?? [];
        console.log('通知を送る人のリストです', tokens);
        
        // 通知を送信
        await sendNotification(tokens, title, body);
    } catch (error) {
        console.error('Error fetching tokens from DynamoDB:', error);
    }
};
