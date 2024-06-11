import awsData from '../../src/config/config';
import { NextApiRequest, NextApiResponse } from 'next';
import { 
    CognitoIdentityProviderClient,
    InitiateAuthCommand
} from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';

const client = new CognitoIdentityProviderClient({ region: awsData.awsRegion });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    if (req.body['key01'] == 'TOKENREFRESH') {
      try {
        const { refreshToken } = req.body;
        
        // リフレッシュトークンを使用して新しいトークンを取得
        const cognitoResponse = await client.send(new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
          ClientId: awsData.cognitoClientId,
        }));
        
        // 新しいトークンを返す
        res.status(200).json({
          idToken: cognitoResponse.AuthenticationResult?.IdToken,
          accessToken: cognitoResponse.AuthenticationResult?.AccessToken,
          refreshToken: cognitoResponse.AuthenticationResult?.RefreshToken,
        });
      } catch (error) {
        console.error('Failed to refresh token:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
      }
    } else
    if (req.body['key01'] == 'CHECKREFRESHTOKEN') {
      try {
        // リクエストボディからリフレッシュトークンを取得
        const { refreshToken } = req.body;
        
        // リフレッシュトークンを検証
        const decodedToken = jwt.verify(refreshToken, 'YOUR_SECRET_KEY') as { exp: number };
  
        // 有効期限をチェック
        const expirationDate = new Date(decodedToken.exp * 1000); // 秒をミリ秒に変換
        const isExpired = expirationDate < new Date();
  
        if (isExpired) {
          res.status(401).json({ message: 'Refresh token is expired' });
        } else {
          res.status(200).json({ message: 'Refresh token is valid' });
        }
      } catch (error) {
        res.status(401).json({ message: 'Invalid refresh token' });
      }
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
