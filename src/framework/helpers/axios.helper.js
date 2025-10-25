import config from '@/configs'
import axios from 'axios'

import { logger } from '@/core/helpers'

const axiosInstance = axios.create({
  baseURL: config.apiEndpoint,
})

export const $get = async (endpoint, config = {}) => {
  logger.http('GET', { endpoint })
  return axiosInstance.get(endpoint, config)
}

export const $post = async (endpoint, data, config = {}) => {
  logger.http('POST', { endpoint })
  return axiosInstance.post(endpoint, data, config)
}
