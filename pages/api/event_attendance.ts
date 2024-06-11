import type { NextApiRequest, NextApiResponse } from 'next';
import awsData from '../../src/config/config';
import { 
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    UpdateItemCommand,
    QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoDbClient = new DynamoDBClient({
  region: awsData.awsRegion,
  credentials: {
    accessKeyId: awsData.accessKeyId!,
    secretAccessKey: awsData.secretAccessKey!,
  },
});

const TABLE_NAME = 'user_attendance';

type Attendance = {
    event_id:   string
    user_id:    string
    attendance: number
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method == 'POST') {
        if (req.body['key01'] == 'GETMYATEND') {
            const event_id =    req.body['eventID'];
            const user_id =     req.body['userID'];

            const params = {
                TableName: TABLE_NAME,
                Key: marshall({ event_id: String(event_id), user_id: String(user_id) }),
            };
            
            try {
                const { Item } = await dynamoDbClient.send(new GetItemCommand(params));
            
                //userのattendanceが存在しない場合は新しく未回答のattendanceを作成する
                if (!Item) {
                    const params = {
                        TableName: TABLE_NAME,
                        Item: marshall({ event_id, user_id, attendance: 1 }),
                    };
                    try {
                        await dynamoDbClient.send(new PutItemCommand(params));
                        return res.status(200).json({ 
                            message: 'User attendance added successfully',
                            body: { event_id, user_id, attendance: 1 },
                        });
                    } catch (error) {
                        console.error('Error adding user attendance:', error);
                        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
                    }
                }

                const userAttendance: Attendance = unmarshall(Item) as Attendance;

                return res.status(200).json(userAttendance);
            } catch (error) {
                console.error('Error fetching data from DynamoDB:', error);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
        } else 
        if (req.body['key01'] == 'POSTMYATEND') {
            const event_id =    req.body['eventID'];
            const user_id =     req.body['userID'];
            const user_atend =  parseInt(req.body['atend']);
            const params = {
                TableName: TABLE_NAME,
                Key: marshall({ event_id, user_id }),
                UpdateExpression: 'SET attendance = :attendance',
                ExpressionAttributeValues: marshall({ ':attendance': user_atend }),
            };
            try {
                await dynamoDbClient.send(new UpdateItemCommand(params));
                return res.status(200).json({ message: 'Attendance updated successfully' });
            } catch (error) {
                console.error('Error updating attendance:', error);
                return res.status(500).json({ message: 'Internal Server Error', error: error.message });
            }
        } else 
        if (req.body['key01'] == 'GETCOMEUSER') {
            const event_id = req.body['eventID'];

console.log('ここまできてます。');

            const params = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'event_id = :event_id',
                ExpressionAttributeValues: marshall({ ':event_id': String(event_id) }),
            };

            try {
                const command = new QueryCommand(params);
                const { Items } = await dynamoDbClient.send(command);

                if (!Items) {
                    return res.status(404).json({ message: 'No attendance records found' });
                }

                const eventAttendance = Items.map((item) => unmarshall(item));

console.log('全員の出席の確認リクエスト', eventAttendance);

                return res.status(200).json(eventAttendance);
            } catch (error) {
                console.error('Error fetching event attendance:', error);
                return res.status(500).json({ message: 'Internal Server Error', error: error.message });
            }
        } else {
            res.status(404).send('Who are you :D')
        }
    } else {
        res.status(404).send('Who are you :D')
    }
}

export default handler