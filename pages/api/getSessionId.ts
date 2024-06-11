import { NextApiRequest, NextApiResponse } from 'next';
import awsData from '../../src/config/config';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoDbClient = new DynamoDBClient({ 
    region: awsData.awsRegion,
    credentials: {
      accessKeyId: awsData.accessKeyId,
      secretAccessKey: awsData.secretAccessKey
    }
});
const TABLE_NAME = 'chatSessionIds';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        if(req.body['key01'] == 'GETSESSION'){
            try {
                // クエリパラメータからイベントIDとユーザーIDを取得
                const eventId = req.body['eventId'];
                const userId = req.body['userId'];
            
                // DynamoDBからセッションIDを取得
                const params = {
                    TableName: TABLE_NAME,
                    Key: {
                        event_id: { S: eventId },
                        user_id: { S: userId },
                    },
                    ProjectionExpression: 'session_id',
                };
                const command = new GetItemCommand(params);
                const { Item } = await dynamoDbClient.send(command);
            
                // セッションIDが見つかった場合、クライアントに返す
                if (Item && Item.session_id && Item.session_id.S) {
                    const sessionId = Item.session_id.S;
                    res.status(200).json({ session_id: sessionId });
                } else {
                    res.status(404).json({ error: 'Session ID not found' });
                }
            } catch (error) {
                console.error('Error fetching session ID:', error);
                res.status(500).json({ error: 'Failed to fetch session ID' });
            }
        } else {
                res.status(405).json({ error: 'Method not allowed' });
        }
    }
}