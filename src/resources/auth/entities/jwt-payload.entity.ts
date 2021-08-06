import { Role } from '../../roles/entities/role.entity';

export class JwtPayload {
  _id: number;
  username: string;
  email: string;
  roles: Role[];

  constructor(_id: number, username: string, email: string, roles: Role[]) {
    this._id = _id;
    this.username = username;
    this.email = email;
    this.roles = roles;
  }
}