import awsData from '../config/config';
import { sendNotificationsFromDynamoDB } from '../Notification/notification'
import { createChatSessions } from './createChatSessions';
import { 
    DynamoDBClient,
    ScanCommand,
    PutItemCommand,
    UpdateItemCommand,
    UpdateItemCommandInput
} from '@aws-sdk/client-dynamodb';
import {
    CognitoIdentityProviderClient,
    ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuidv4 } from 'uuid';


const TABLE_NAME = 'user_attendance';
const dynamoDBClient = new DynamoDBClient({ 
    region: awsData.awsRegion,
    credentials: {
      accessKeyId: awsData.accessKeyId,
      secretAccessKey: awsData.secretAccessKey
    }
});
const cognitoClient = new CognitoIdentityProviderClient({
    region: awsData.awsRegion,
    credentials: {
      accessKeyId: awsData.accessKeyId as string,
      secretAccessKey: awsData.secretAccessKey as string,
    },
});


// 全ユーザの出欠を作成
async function createUserAttendance(event_id: string): Promise<void> {
    try {
        // Cognitoから全ユーザーの情報を取得
        const command = new ListUsersCommand({
                UserPoolId: awsData.cognitoUserPoolId, // ユーザープールIDを指定
                AttributesToGet: ['sub'] // ユーザーIDの属性のみを取得
        });
        const response = await cognitoClient.send(command);
    
        // 全ユーザーのユーザーIDを取得し、出席情報をDynamoDBに更新
        if (response.Users) {
            const promises = response.Users.map(async (user: any) => {
            const user_id = user.Attributes?.find((attr: any) => attr.Name === 'sub')?.Value;
            if (user_id) {
                const params = {
                    TableName: TABLE_NAME,
                    Key: {
                        event_id: { S: event_id },
                        user_id: { S: user_id }
                    },
                    UpdateExpression: 'SET attendance = :attendance',
                    ExpressionAttributeValues: {
                        ':attendance': { N: '1' }
                    }
                };
    
                await dynamoDBClient.send(new UpdateItemCommand(params));
            }
        });
    
            // 全てのユーザーの出席情報の更新が完了するまで待機
            await Promise.all(promises);
        }
  
        console.log('出席情報の更新が完了しました');
    } catch (error) {
        console.error('出席情報の更新中にエラーが発生しました', error);
        throw error;
    }
}

//テーブルからイベントデータを取得する関数
export async function getEventFromDynamoDB(tableName: string): Promise<any[]> {
    
    // スキャン操作のパラメータ
    const getParams = {
        TableName: tableName
    };
    try{
        const command = new ScanCommand(getParams);
        const response = await dynamoDBClient.send(command);
console.log('Scan succeeded: getEventData');

        return response.Items;
    } catch (err) {
        console.error('Unable to scan the table. Error:', err);
    }
}



//新しいイベントデータを追加する関数
export async function addEventToDynamoDB(tableName: string, item: any, coordinatorId: string): Promise<any> {
console.log('新しいイベントの設定');

    // イベントIDの生成
    const eventId = uuidv4();

    const putParams = {
        TableName: tableName,
        Item: {
            'event_id': { S: eventId },
            'event_finished': { N: item.event_finished || '0' },
            'event_coordinator_id': { S: item.event_coordinator_id },
            'event_title': { S: item.event_title },
            'event_date': { S: item.event_date },
            'event_attendancedate': { S: item.event_attendancedate },
            'event_start_time': { S: item.event_start_time },
            'event_end_time': { S: item.event_end_time },
            'event_place': { S: item.event_place },
            'event_address': { S: item.event_address },
            'event_note': { S: item.event_note }
        }
    };

    try {
        // データを追加する
        const command = new PutItemCommand(putParams);
        const response = await dynamoDBClient.send(command);
console.log("Item added successfully:", response);

        // チャットセッションの作成
        await createChatSessions({ eventId, coordinatorId });
        // 全員の出席(未回答)を作成
        await createUserAttendance(eventId);
        // 全員通知を飛ばす処理の関数
        await sendNotificationsFromDynamoDB(
            '新しいイベントが設定されました',
            item.event_title
        );

        return eventId;
    } catch (error) {
console.error("Error adding item to DynamoDB:", error);
        return null;
    }
}

//イベントの書き換えを行う関数
export async function updateEventInDynamoDB(tableName: string, partitionKey: string, event: any): Promise<number> {
    const updateParams: UpdateItemCommandInput = {
        TableName: tableName,
        Key: {
            'event_id': { S: partitionKey },
        },
        UpdateExpression: 'set event_finished = :event_finished, event_title = :event_title, event_date = :event_date, event_attendancedate = :event_attendancedate, event_start_time = :event_start_time, event_end_time = :event_end_time, event_place = :event_place, event_address = :event_address, event_note = :event_note',
        ExpressionAttributeValues: {
            ':event_finished': { N: event.event_finished?.toString() },
            // 'event_coordinator_id': { S: event.event_coordinator_id },
            ':event_title': { S: event.event_title ?? '' },
            ':event_date': { S: event.event_date ?? '' },
            ':event_attendancedate': { S: event.event_attendancedate ?? '' },
            ':event_start_time': { S: event.event_start_time ?? '' },
            ':event_end_time': { S: event.event_end_time ?? '' },
            ':event_place': { S: event.event_place ?? '' },
            ':event_address': { S: event.event_address ?? '' },
            ':event_note': { S: event.event_note ?? '' }
        }
    };

    try {
        const command = new UpdateItemCommand(updateParams);
        await dynamoDBClient.send(command);
        console.log("Item updated successfully:", partitionKey);

        // イベント編集の通知
        await sendNotificationsFromDynamoDB(
            'イベントが編集されました',
            event.event_title
        );

        return 0;
    } catch (error) {
        console.error("Error updating item in DynamoDB:", error);
        return 1;
    }
}

// イベントを終わらせる関数
export async function finishEvent(tableName: string, partitionKey: string): Promise<number> {
    const updateParams: UpdateItemCommandInput = {
        TableName: tableName,
        Key: {
            'event_id': { S: partitionKey },
        },
        UpdateExpression: 'set event_finished = :event_finished',
        ExpressionAttributeValues: {
            ':event_finished': { N: '1' },
        }
    };

    try {
        const command = new UpdateItemCommand(updateParams);
        await dynamoDBClient.send(command);
        console.log("Item updated successfully:", partitionKey);
        return 0;
    } catch (error) {
        console.error("Error updating item in DynamoDB:", error);
        return 1;
    }
}

