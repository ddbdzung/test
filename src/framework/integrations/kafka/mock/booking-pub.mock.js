const { Kafka } = require('kafkajs')
/* eslint-disable */

// Khởi tạo Kafka client
const kafka = new Kafka({
  clientId: 'smaxapp', // Tên client ID của bạn
  brokers: ['localhost:9092'], // thay bằng địa chỉ Kafka broker của bạn
})

// Producer instance
const producer = kafka.producer()

async function publishToKafkaTopic(topic, message) {
  await producer.connect() // Kết nối đến Kafka broker

  const result = await producer.send({
    topic: topic,
    messages: [{ value: message }],
  })

  // console.log(`Đã gửi message đến topic "${topic}":`, message);
  await producer.disconnect() // Ngắt kết nối sau khi gửi
}

const data = {
  bizId: 'biz-123',
  customerId: 'cust-456',
  customerName: 'John Doe',
  actionType: 'CREATE',
  actionAt: new Date().toISOString(),
}

// Ví dụ sử dụng: node src/services/kafka/mock/test-publish-msg.js
publishToKafkaTopic('BOOKING.LOG', JSON.stringify(data)).catch(console.error)
