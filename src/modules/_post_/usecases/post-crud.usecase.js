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
}

export const postCrudUsecase = new PostCrudUsecase(postService)
