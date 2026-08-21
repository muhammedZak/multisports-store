import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { connectDatabase } from '../config/database.js';

import { User } from '../modules/users/user.model.js';

import { NOTIFICATION_TYPES } from '../modules/notification/notification.constants.js';

import { Notification } from '../modules/notification/notification.model.js';

import { createNotification } from '../modules/notification/notification.service.js';

async function run() {
  let createdNotificationId = null;

  try {
    await connectDatabase();

    await Notification.init();

    const recipient = await User.findOne({
      role: {
        $in: ['customer', 'admin'],
      },
    }).select('_id role email');

    assert.ok(
      recipient,
      'A Customer or Admin User is required for verification.',
    );

    console.log('Using recipient:', recipient.email, recipient.role);

    const notification = await createNotification({
      recipientId: recipient._id,
      type: NOTIFICATION_TYPES.ORDER,
      title: '  Task 12.1 Test Notification  ',
      message: '  Notification persistence is working.  ',
    });

    createdNotificationId = notification._id;

    assert.equal(notification.type, 'order');

    assert.equal(notification.title, 'Task 12.1 Test Notification');

    assert.equal(notification.message, 'Notification persistence is working.');

    assert.equal(notification.resourceType, null);
    assert.equal(notification.resourceId, null);
    assert.equal(notification.readAt, null);

    console.log('PASS: valid Notification persisted');

    let invalidTypeRejected = false;

    try {
      await createNotification({
        recipientId: recipient._id,
        type: 'invalid-type',
        title: 'Invalid',
        message: 'This should fail.',
      });
    } catch (error) {
      invalidTypeRejected = error.code === 'VALIDATION_ERROR';
    }

    assert.equal(invalidTypeRejected, true);

    console.log('PASS: invalid type rejected');

    let emptyTitleRejected = false;

    try {
      await createNotification({
        recipientId: recipient._id,
        type: NOTIFICATION_TYPES.ORDER,
        title: '   ',
        message: 'This should fail.',
      });
    } catch (error) {
      emptyTitleRejected = error.code === 'VALIDATION_ERROR';
    }

    assert.equal(emptyTitleRejected, true);

    console.log('PASS: empty title rejected');

    let invalidRecipientRejected = false;

    try {
      await createNotification({
        recipientId: new mongoose.Types.ObjectId(),
        type: NOTIFICATION_TYPES.ORDER,
        title: 'Invalid recipient',
        message: 'This should fail.',
      });
    } catch (error) {
      invalidRecipientRejected =
        error.code === 'NOTIFICATION_RECIPIENT_NOT_FOUND';
    }

    assert.equal(invalidRecipientRejected, true);

    console.log('PASS: nonexistent recipient rejected');

    assert.equal(Notification.schema.path('isRead'), undefined);

    console.log('PASS: no isRead field exists');

    const indexes = await Notification.collection.indexes();

    const historyIndex = indexes.find(
      (index) => index.name === 'notification_recipient_history',
    );

    assert.ok(historyIndex);

    assert.deepEqual(historyIndex.key, {
      recipientId: 1,
      createdAt: -1,
    });

    console.log('PASS: recipient history index exists');

    const unreadIndex = indexes.find(
      (index) => index.name === 'notification_recipient_read_history',
    );

    assert.ok(unreadIndex);

    assert.deepEqual(unreadIndex.key, {
      recipientId: 1,
      readAt: 1,
      createdAt: -1,
    });

    console.log('PASS: unread/history index exists');

    const hasTtlIndex = indexes.some(
      (index) => index.expireAfterSeconds !== undefined,
    );

    assert.equal(hasTtlIndex, false);

    console.log('PASS: no TTL index exists');

    console.log('');
    console.log('Task 12.1 verification PASSED');
  } finally {
    if (createdNotificationId) {
      await Notification.deleteOne({
        _id: createdNotificationId,
      });

      console.log('Verification Notification cleaned up');
    }

    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('');
  console.error('Task 12.1 verification FAILED');
  console.error(error);

  process.exitCode = 1;
});
