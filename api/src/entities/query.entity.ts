import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from 'typeorm';

@Entity()
export class QueryResponseEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  query: string;

  @Column()
  response: string;

  @Column({ type: 'simple-json' })
  contexts: any;

  @Column({ type: 'simple-json' })
  choices: any;

  @Column({ type: 'simple-json' })
  model_settings: any;
}

export async function saveQuery(
  query: string,
  contexts: any,
  response: string,
  choices: any,
  model_settings: any,
) {
  const entity = new QueryResponseEntity();
  entity.query = query;
  entity.response = response;
  entity.choices = choices;
  entity.contexts = contexts;
  entity.model_settings = model_settings;
  await entity.save();
}
