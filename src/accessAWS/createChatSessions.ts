import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import awsData from '../config/config';
import { v4 as uuidv4 } from 'uuid';

const dynamoDbClient = new DynamoDBClient({ 
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
    }
});
const TABLE_NAME = 'ChatSessions';
const SESSION_TABLE_NAME = 'chatSessionIds';

interface CreateChatSessionsRequest {
  eventId: string;
  coordinatorId: string;
}

export const createChatSessions = async ({ eventId, coordinatorId }: CreateChatSessionsRequest) => {
    if (!eventId || !coordinatorId) {
        throw new Error('Event ID, Coordinator ID, and User Pool ID are required');
    }

    // Cognitoからユーザー情報を取得
    const listUsersCommand = new ListUsersCommand({
        UserPoolId: awsData.cognitoUserPoolId,
    });

    const listUsersResponse = await cognitoClient.send(listUsersCommand);

console.log('cognitoへのアクセスうまく言ってます。', listUsersResponse);

    const userIds = listUsersResponse.Users?.map(user => user.Username!) || [];

    // 全体チャットのセッションIDを作成
    const groupChatSessionId = uuidv4();
    const groupChatCommand = new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
            session_id: { S: eventId },
            event_id: { S: eventId },
            is_group_chat: { BOOL: true },
            participants: { L: userIds.map(userId => ({ S: userId })) },
            message_ids: { L: [] },
        },
    });

console.log('全体チャットの準備できてます');

    // DynamoDBに全体チャットのセッションを保存
    await dynamoDbClient.send(groupChatCommand);

console.log('全体チャットの追加できてます');

    const coordinatorChatCommands: PutItemCommand[] = [];
    const coordinatorChatSessionCommands: PutItemCommand[] = [];

    // 各ユーザとの個別チャットセッションを作成
    userIds.map(userId => {
        if (userId != coordinatorId) {
            const sessionId = uuidv4();

            coordinatorChatCommands.push(new PutItemCommand({
                TableName: TABLE_NAME,
                Item: {
                    session_id: { S: sessionId },
                    event_id: { S: eventId },
                    is_group_chat: { BOOL: false },
                    participants: { L: [{ S: coordinatorId }, { S: userId }] },
                    message_ids: { L: [] },
                },
            }));

            coordinatorChatSessionCommands.push(new PutItemCommand({
                TableName: SESSION_TABLE_NAME,
                Item: {
                    user_id: { S: userId },
                    event_id: { S: eventId },
                    session_id: { S: sessionId },
                },
            }));
        }
    });

    // DynamoDBに保存
    await Promise.all(coordinatorChatCommands.map(cmd => dynamoDbClient.send(cmd)));
    await Promise.all(coordinatorChatSessionCommands.map(cmd => dynamoDbClient.send(cmd)));

    return {
        groupChatSessionId,
        individualChatSessionIds: coordinatorChatCommands.map(cmd => cmd.input.Item.session_id.S),
    };
};
