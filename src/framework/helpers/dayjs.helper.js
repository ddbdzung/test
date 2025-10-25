import dayjs from 'dayjs'
import dayjsTimeZone from 'dayjs/plugin/timezone'
import dayjsUTC from 'dayjs/plugin/utc'

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'

dayjs.extend(dayjsUTC)
dayjs.extend(dayjsTimeZone)

export default dayjs
