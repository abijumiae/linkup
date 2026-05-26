import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@Req() req: { user: SafeUser }, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.id, dto);
  }

  @Get('feed')
  getFeed(@Req() req: { user: SafeUser }) {
    return this.postsService.getFeed(req.user.id);
  }

  @Get('me')
  getMyPosts(@Req() req: { user: SafeUser }) {
    return this.postsService.getMyPosts(req.user.id);
  }

  @Post(':postId/like')
  toggleLike(
    @Param('postId') postId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.postsService.toggleLike(postId, req.user.id);
  }

  @Post(':postId/comments')
  createComment(
    @Param('postId') postId: string,
    @Req() req: { user: SafeUser },
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.createComment(postId, req.user.id, dto);
  }

  @Get(':postId/comments')
  getComments(@Param('postId') postId: string) {
    return this.postsService.getComments(postId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.postsService.delete(id, req.user.id);
  }
}
