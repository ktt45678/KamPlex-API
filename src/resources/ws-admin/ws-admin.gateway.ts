import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { SocketRoom } from '../../enums';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({ namespace: 'ws/admin', cors: { origin: '*' }, transports: ['websocket'] })
export class WsAdminGateway implements OnGatewayConnection {
  @WebSocketServer() public server: Server;

  constructor(private authService: AuthService) { }

  async handleConnection(client: Socket) {
    const accessToken = <string>client.handshake.auth['token'];
    try {
      const user = await this.authService.verifyAccessToken(accessToken);
      await client.join(`${SocketRoom.USER_ID}:${user._id}`);
    } catch (e) {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('room:join')
  async handleRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: string): Promise<boolean> {
    await client.join(payload);
    return true;
  }

  @SubscribeMessage('room:leave')
  async handleRoomLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: string): Promise<boolean> {
    await client.leave(payload);
    return true;
  }
}
