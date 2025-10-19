import { postService } from '../services/post.service'

export class PostCrudUsecase {
  /**
   * @param {import('../services/post.service').PostService} postService
   */
  constructor(postService) {
    this.postService = postService
  }

  createOnePostUsecase(dto) {
    return this.postService.createOne(dto)
  }

  updateOnePostUsecase(queryDto, bodyDto) {
    return this.postService.updateOne(queryDto, bodyDto)
  }

  async getListPostUsecase(queryDto) {
    const total = await this.postService.getTotal(queryDto)
    if (total === 0) {
      return {
        list: [],
        total: 0,
      }
    }

    return {
      list: await this.postService.getList(queryDto),
      total,
    }
  }

  getDetailPostUsecase(queryDto) {
    return this.postService.getDetail(queryDto)
  }

  deleteOnePostUsecase(queryDto) {
    return this.postService.deleteOne(queryDto)
  }
}

export const postCrudUsecase = new PostCrudUsecase(postService)
