import type { NextApiRequest, NextApiResponse } from 'next'
import awsData from '../../src/config/config';
import {
    CognitoIdentityProviderClient,
    AdminUpdateUserAttributesCommand,
    ListUsersCommand,
    AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
    region: awsData.awsRegion,
    credentials: {
      accessKeyId: awsData.accessKeyId as string,
      secretAccessKey: awsData.secretAccessKey as string,
    },
});

async function getUserAttributes(username) {
    const params = {
        UserPoolId: awsData.cognitoUserPoolId,
        Username: username,
    };

    try {
        const command = new AdminGetUserCommand(params);
        const { UserAttributes } = await client.send(command);
        return UserAttributes;
    } catch (error) {
        console.error('Error fetching user attributes:', error);
        throw error;
    }
}

const hand = async (req: NextApiRequest, res: NextApiResponse) => {
// 全員のデータを取得する_______________________________________________________________________________
    if (req.method == 'GET') {
        try {
            const params = {
                UserPoolId: awsData.cognitoUserPoolId,
            };
        
            const command = new ListUsersCommand(params);
            const response = await client.send(command);
        
console.log(response.Users);

            // ユーザーリストをレスポンスとして返す
            return res.status(200).json(response.Users);
            } catch (error) {
                console.error("Error listing users:", error);
                return res.status(500).json({ message: "Internal Server Error", error: error.message });
            }
    } else
// 自分のデータを取得する_______________________________________________________________________________
    if (req.method == 'POST') {
        if (req.body['key01'] == 'GETMYDATA') {
            try {
                const sub = req.body['sub'];

                // subが指定されているか確認
                if (!sub) {
                    return res.status(400).json({ message: 'Missing required field: sub' });
                }

console.log(sub);
                
                const params = {
                    UserPoolId: awsData.cognitoUserPoolId,
                    Username: sub,
                };

                const command = new AdminGetUserCommand(params);
                const response = await client.send(command);
            
                const attributes = response.UserAttributes.reduce((acc, attr) => {
                    acc[attr.Name] = attr.Value;
                    return acc;
                }, {});
console.log('ここきたぜ(プロフィールデータを持ってくる)', attributes);

                return res.status(200).json({ userAttributes: attributes });
            } catch (error) {
                // エラーが発生した場合は500エラーを返す
                console.error('Error finding user by sub:', error);
                return res.status(500).json({ message: 'Internal Server Error', error: error.message });
            }
        } else 
// 自分のプロフィールを編集する______________________________________________________________________________
        if (req.body['key01'] == 'EDITMYDATA') {
            const { sub, attributes } = req.body;

            if (!sub || !attributes) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            const userAttributes = Object.entries(attributes).map(([Name, Value]) => ({ Name, Value: Value as string }));

console.log('プロフィールの変更処理\nID: ', sub, '\nnewProfile: ', userAttributes)

            const params = {
                UserPoolId: awsData.cognitoUserPoolId,
                Username: sub,
                UserAttributes: userAttributes,
            };

            try {
                const command = new AdminUpdateUserAttributesCommand(params);
                await client.send(command);

                const updatedAttributes = await getUserAttributes(sub);

                // 更新された属性の中からIdTokenを取得する
                const updatedIdToken = updatedAttributes.find(attribute => attribute.Name === 'custom:idToken');

                return res.status(200).json({ message: 'User attributes updated successfully', idToken: updatedIdToken?.Value });
            } catch (error) {
                console.error('Error updating user attributes:', error);
                return res.status(500).json({ message: 'Internal Server Error', error: error.message });
            }
        } else 
// addmin権限の付与を行い、自身の権限を剥奪する_______________________________________________________________________________
        if (req.body['key01'] == 'CHANGEADDMIN') {
            const { adminId, targetUserId, attributes } = req.body;

            if (!adminId || !targetUserId || !attributes) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            const userAttributes = Object.entries(attributes).map(([Name, Value]) => ({
            Name,
            Value: Value.toString(),
            }));

            const params = {
                UserPoolId: awsData.cognitoUserPoolId,
                Username: targetUserId,
                UserAttributes: userAttributes,
            };

            try {
                const command = new AdminUpdateUserAttributesCommand(params);
                await client.send(command);
                return res.status(200).json({ message: 'User attributes updated successfully' });
            } catch (error) {
                console.error('Error updating user attributes:', error);
                return res.status(500).json({ message: 'Internal Server Error', error: error.message });
            }
        } else {
            res.setHeader('Allow', ['POST']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    }
}

export default hand