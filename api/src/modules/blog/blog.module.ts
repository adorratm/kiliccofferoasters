import { Module } from '@nestjs/common';
import { BlogService } from '@modules/blog/blog.service';
import { BlogController } from '@modules/blog/blog.controller';

@Module({
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
