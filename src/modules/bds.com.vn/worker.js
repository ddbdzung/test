import axios from 'axios'

const endpoint = 'https://bds.com.vn/'
const axiosInstance = axios.create({
  baseURL: endpoint,
})

export default async function webScrapingWorker() {
  // Đi tới trang Cho thuê nhà đất => Lấy danh sách bài viết được phân loại theo Địa chỉ
  const resp = await axiosInstance.get('/cho-thue-nha-dat').then(res => {
    // if (res.)
  })
  // console.log(`[worker.js] respresp:`, resp.);
}
