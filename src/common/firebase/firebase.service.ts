import { Inject, Injectable, Logger } from '@nestjs/common';
import * as firebaseAdmin from 'firebase-admin';

import { FIREBASE_OPTIONS } from './firebase.constants';
import { FirebaseOptions } from './interfaces/firebase-options.interface';

@Injectable()
export class FirebaseService {
  constructor(@Inject(FIREBASE_OPTIONS) private optionsProvider: FirebaseOptions, private readonly logger: Logger) {
    if (firebaseAdmin.apps.length === 0) {
      const adminConfig: firebaseAdmin.ServiceAccount = {
        projectId: this.optionsProvider.projectId,
        privateKey: this.optionsProvider.privateKey,
        clientEmail: this.optionsProvider.clientEmail
      };
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(adminConfig),
        databaseURL: this.optionsProvider.databaseURL
      });
    }
  }

  async sendMessage(deviceIds: string[], payload: firebaseAdmin.messaging.MessagingPayload, silent: boolean = false) {
    if (!deviceIds.length)
      return;

    const options = {
      priority: 'high',
      timeToLive: 60 * 60 * 24
    };

    const optionsSilent = {
      priority: 'high',
      timeToLive: 60 * 60 * 24,
      content_available: true
    };

    let result = null;
    try {
      result = await firebaseAdmin
        .messaging()
        .sendToDevice(deviceIds, payload, silent ? optionsSilent : options);
    } catch (error) {
      this.logger.error(error.message, error.stackTrace, 'firebase');
      throw error;
    }
    return result;
  }
}
