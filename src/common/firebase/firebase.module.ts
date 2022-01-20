import { DynamicModule, Global, Logger, Module, ValueProvider } from '@nestjs/common';

import { FIREBASE_OPTIONS } from './firebase.constants';
import { FirebaseOptions } from './interfaces/firebase-options.interface';
import { FirebaseService } from './firebase.service';

@Global()
@Module({})
export class FirebaseModule {
  static forRoot(options: FirebaseOptions): DynamicModule {
    const optionsProvider: ValueProvider = {
      provide: FIREBASE_OPTIONS,
      useValue: options,
    };
    const logger = new Logger('FirebaseService');
    return {
      module: FirebaseModule,
      providers: [
        { provide: Logger, useValue: logger },
        FirebaseService,
        optionsProvider
      ],
      exports: [FirebaseService],
    };
  }
}
