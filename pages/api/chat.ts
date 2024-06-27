import type { NextApiRequest, NextApiResponse } from 'next';
import awsData from '../../src/config/config';
import {
    SendChatNotification
} from '../../src/accessAWS/accessdynamo';
import { v4 as uuidv4 } from 'uuid';
import {
    DynamoDBClient,
    PutItemCommand,
    UpdateItemCommand,
    BatchGetItemCommand,
    BatchGetItemCommandInput,
    BatchGetItemCommandOutput,
} from '@aws-sdk/client-dynamodb';

const SESSION_TABLE_NAME = 'ChatSessions';
const MESSAGE_TABLE_NAME = 'ChatMessages';
const dynamoDbClient = new DynamoDBClient({ 
    region: awsData.awsRegion,
    credentials: {
        accessKeyId: awsData.accessKeyId,
        secretAccessKey: awsData.secretAccessKey,
    },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
console.log('chatのエンドポイントは生きてます。');
    if (req.method == 'POST') {
        if(req.body['key01'] == 'FETCHMESSAGE'){
            const sessionId = req.body['sessionId'];

            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID is required' });
            }

console.log('チャットのsessionIdです:', sessionId);
          
            try {
                // ChatSessionsテーブルからセッションに関連するメッセージIDを取得
                const chatSessionParams: BatchGetItemCommandInput = {
                    RequestItems: {
                        [SESSION_TABLE_NAME]: {
                          Keys: [
                            {
                              session_id: { S: sessionId },
                            },
                          ],
                          ProjectionExpression: 'message_ids',
                        },
                      },
                };
                const chatSessionResult: BatchGetItemCommandOutput = await dynamoDbClient.send(new BatchGetItemCommand(chatSessionParams));
                const messageIds = chatSessionResult.Responses?.ChatSessions?.[0]?.message_ids?.L?.map(item => item.S) || [];
          
console.log('sessionIdのmessageIdたちはとれてきてます:', messageIds);

                // ChatMessagesテーブルからメッセージの内容を取得
                if (messageIds.length != 0) {
                    const messageParams: BatchGetItemCommandInput = {
                        RequestItems: {
                            [MESSAGE_TABLE_NAME]: {
                                Keys: messageIds.map((messageId: string) => ({
                                    message_id: { S: messageId },
                                    session_id: { S: sessionId }
                                })),
                                ProjectionExpression: '#message_id, #sender_id, #sender_name, #message, #timestamp',
                                ExpressionAttributeNames: {
                                    '#message_id': 'message_id',
                                    '#sender_id': 'sender_id',
                                    '#sender_name': 'sender_name',
                                    '#message': 'message',
                                    '#timestamp': 'timestamp',
                                },
                            },
                        },
                    };

console.log(messageParams);

                    const messageResult: BatchGetItemCommandOutput = await dynamoDbClient.send(new BatchGetItemCommand(messageParams));
                    console.log('Raw messageResult:', JSON.stringify(messageResult, null, 2));

                    if (messageResult.Responses && messageResult.Responses[MESSAGE_TABLE_NAME]) {
                        const messages = messageResult.Responses[MESSAGE_TABLE_NAME].map((item: any) => ({
                            messageId: item.message_id.S,
                            senderId: item.sender_id.S,
                            senderName: item.sender_name.S,
                            message: item.message.S,
                            timestamp: new Date(item.timestamp.S),
                        }));
                        console.log('Parsed messages:', messages);
                        res.status(200).json(messages);
                    } else {
                        console.log('No messages found');
                    }
                } else {
                    res.status(202).json('noMessage');
                }
            } catch (error) {
                console.error('Error fetching chat messages:', error);
                res.status(500).json({ error: 'Failed to fetch chat messages' });
            }
        } else
        if (req.body['key01'] == 'SENDMESSAGE') {
            const { sessionId, senderId, senderName, message } = req.body;
    
console.log('message送信のリクエストが来ました。', sessionId, senderId, senderName, message);
    
            if (!sessionId || !senderId || !senderName || !message) {
                return res.status(400).json({ error: 'Session ID, Sender ID, Sender Name, and Message are required' });
            }
        
            const messageId = uuidv4();
            const timestamp = new Date().toISOString();
        
            const newMessage = {
                message_id: { S: messageId },
                session_id: { S: sessionId },
                sender_id: { S: senderId },
                sender_name: { S: senderName },
                message: { S: message },
                timestamp: { S: timestamp },
            };

console.log('message追加のリクエストを作成しました。', newMessage);
    
            try {
                // ChatMessagesテーブルに新しいメッセージを追加
                const putItemCommand = new PutItemCommand({
                    TableName: MESSAGE_TABLE_NAME,
                    Item: newMessage,
                });
            
                await dynamoDbClient.send(putItemCommand);
            
console.log(MESSAGE_TABLE_NAME, 'へのメッセージの追加はできました。');

                // ChatSessionsテーブルのmessage_idsに新しいメッセージIDを追加
                const updateItemCommand = new UpdateItemCommand({
                    TableName: SESSION_TABLE_NAME,
                    Key: {
                        session_id: { S: sessionId },
                    },
                    UpdateExpression: 'SET message_ids = list_append(if_not_exists(message_ids, :empty_list), :new_message_id)',
                    ExpressionAttributeValues: {
                        ':new_message_id': { L: [{ S: messageId }] },
                        ':empty_list': { L: [] },
                    },
                });
            
                await dynamoDbClient.send(updateItemCommand);
                
                SendChatNotification(sessionId, senderId, senderName, message);

                res.status(200).json({ messageId, timestamp });
            } catch (error) {
                console.error('Error adding message to DynamoDB:', error);
                res.status(500).json({ error: 'Failed to add message' });
            } 
        } 
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};

// 