import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('./', import.meta.url);
const path = 'plugins/tasks/alibaba/1.3.1-qwen.2/';
const load = async p => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(new URL(p, root))).toString('base64'));
const plugin = await load(path + 'plugin.js');
const original = await load('plugins/tasks/alibaba/1.3.0/plugin.js');
const cases = [];
const add = (name, hook, args, expected, member) => cases.push({name, hook, ...(member ? {member} : {}), args, expected});
const bad = (name, hook, args, error, member) => cases.push({name, hook, ...(member ? {member} : {}), args, expectedError: error});
const context = (model = 'qwen-image-3.0', req = {}) => ({model, upstreamModel:model, baseUrl:'https://fixture.invalid', apiKey:'fixture-not-a-secret', publicTaskId:'public-test', requestBody:{model, prompt:'A red teapot', size:'1024x1024', ...req}});
const facts = (a=0,b=0,c=0,d=0) => ({qima_input_1k:a,qima_input_2k:b,qima_output_1k:c,qima_output_2k:d});
const result = (input=0, output=1, tier='1k') => ({request_id:'provider-request', output:{task_status:'SUCCEEDED', choices:[{message:{role:'assistant',content:Array.from({length:output},(_,i)=>({image:`https://fixture.invalid/image-${i}.png`}))}}]}, usage:{input_image_count:input,input_image_type:'qima_input_'+tier,output_image_count:output,output_image_type:'qima_output_'+tier}});
for (const model of ['qwen-image-3.0','qwen-image-3.0-pro']) {
  for (const mode of ['sync','async']) {
    const ctx = context(model,{seed:0,prompt_extend:false,enable_thinking:false,watermark:false,metadata:{upstream_mode:mode}});
    add(`${model}.${mode}.request`, 'buildSubmitRequest',[ctx], {url:'https://fixture.invalid/api/v1/services/aigc/'+(mode==='sync'?'multimodal-generation/generation':'image-generation/generation'),method:'POST',headers:{Authorization:'Bearer fixture-not-a-secret','Content-Type':'application/json',...(mode==='async'?{'X-DashScope-Async':'enable'}:{})},body:{model,input:{messages:[{role:'user',content:[{text:'A red teapot'}]}]},parameters:{n:1,size:'1024*1024',seed:0,prompt_extend:false,enable_thinking:false,watermark:false}},action:'text_to_image',responseType:'json'});
  }
  add(`${model}.reserve.fixed`,'extractUsage',[context(model)],facts(0,0,1,0));
  add(`${model}.reserve.auto`,'extractUsage',[context(model,{size:'auto',image:['https://fixture.invalid/a','https://fixture.invalid/b'],n:6})],facts(2,2,6,6));
  add(`${model}.reserve.2k`,'extractUsage',[context(model,{size:'2048x2048',image:'data:image/png;base64,YQ=='})],facts(0,1,0,1));
  add(`${model}.complete.1k`,'extractUsageOnComplete',[{model},{status:'SUCCESS'},result(3,2)],facts(3,0,2,0));
  add(`${model}.complete.2k`,'extractUsageOnComplete',[{model},{status:'SUCCESS'},result(0,1,'2k')],facts(0,0,0,1));
  add(`${model}.failed.noUsage`,'extractUsageOnComplete',[{model},{status:'FAILURE'},result()],{});
  add(`${model}.immediate`,'parseSubmitResponse',[context(model,{metadata:{upstream_mode:'sync'}}),{body:result()}],{taskId:'public-test',taskData:result(),immediate:{status:'SUCCESS',progress:'100%',url:'https://fixture.invalid/image-0.png'}});
}
for(const [name,req,error] of [
  ['zero',{n:0},'n must'],['negative',{n:-1},'n must'],['fraction',{n:1.5},'n must'],['oversize',{n:7},'n must'],['overflow',{n:1e30},'n must'],['string',{n:'2'},'n must'],['null',{n:null},'n must'],
  ['metadata-bypass',{metadata:{parameters:{n:128}}},'n must'],['bool-string',{enable_thinking:'false'},'boolean'],['metadata-bool',{metadata:{parameters:{watermark:0}}},'boolean'],
  ['bad-size',{size:'0x2048'},'limits'],['large-size',{size:'4096x4096'},'limits'],['tiny-size',{size:'100x100'},'limits'],['bad-ratio',{size:'256x4096'},'limits'],
  ['null-image',{image:null},'image must'],['empty-image',{image:[]},'empty'],['many-images',{image:Array(4).fill('https://fixture.invalid/a')},'at most 3'],
  ['mixed-image',{image:'https://fixture.invalid/a',images:['https://fixture.invalid/b']},'not both'],['agent-edit',{image:'https://fixture.invalid/a',prompt_extend_mode:'agent'},'agent'],
  ['seed-bound',{seed:2147483648},'seed'],['seed-negative',{seed:-1},'seed'],['missing-prompt',{prompt:''},'prompt'],['unknown-param',{metadata:{parameters:{stream:true}}},'unsupported'],['model-override',{metadata:{model:'bad'}},"can't change model"]
]) bad('validate.'+name,'buildSubmitRequest',[context(undefined,req)],error);
bad('legacy-pricing-denied','extractUsage',[{...context(),usagePurpose:'billing_ratios'}],'requires task usage expression');
for(const [name,change,error] of [['missing-input',{input_image_count:undefined},'input_image_count'],['negative-output',{output_image_count:-1},'output_image_count'],['wrong-type',{output_image_type:'other'},'billing type'],['mismatch',{output_image_count:2},'disagrees']]) {
  const body = result();Object.assign(body.usage,change);
  bad('completion.'+name,'extractUsageOnComplete',[{model:'qwen-image-3.0'},{status:'SUCCESS'},body],error);
}
add('alias-keeps-upstream','extractUsage',[{...context(),model:'my-qwen'}],facts(0,0,1,0));
const native = {model:'qwen-image-3.0',prompt:'A red teapot',image:['https://fixture.invalid/a'],size:'1024x1024',n:2};
add('compatible-native-decode','native',[{body:{kind:'json',value:native}}],{kind:'submit',model:native.model,action:'image_to_image',requestBody:{...native,metadata:{upstream_mode:'sync'}}},'createQwenCompatible');
bad('compatible-no-stream','native',[{body:{kind:'json',value:{...native,stream:true}}}],'streaming','createQwenCompatible');
add('compatible-native-render','native',[{},{created_at:123,data:result(1,2)}],{created:123,data:[{url:'https://fixture.invalid/image-0.png'},{url:'https://fixture.invalid/image-1.png'}],usage:result(1,2).usage},'qwenImageCreated');
for (const [status,expected] of [['PENDING',{status:'QUEUED'}],['RUNNING',{status:'IN_PROGRESS'}],['FAILED',{status:'FAILURE',reason:'[QWEN_UPSTREAM_ERROR] 原厂返回错误，请按请求 ID 核查；不要盲目重新生成 [code=upstream_error]'}]]) add('query.'+status,'parseTaskResult',[{model:'qwen-image-3.0'},{output:{task_status:status}}],expected);
add('artifact-all-images','listArtifacts',[{status:'SUCCESS',data:result(0,2)}],[{key:'image-1',type:'image'},{key:'image-2',type:'image'}]);
add('artifact-download-no-credentials','buildContentRequest',[{artifactKey:'image-2',data:result(0,2),clientRequest:{method:'GET'}}],{url:'https://fixture.invalid/image-1.png',method:'GET',credentialless:true});
// Existing upstream release is the oracle only for unchanged Wan behavior.
for(const model of ['wan3.0-video','wan3.0-video-prime','wan2.7-image']) {
  const ctx=context(model,{size:undefined,resolution:'720P',seconds:5,n:1});
  for(const hook of ['buildSubmitRequest','extractUsage']) add('wan-regression.'+model+'.'+hook,hook,[ctx],original[hook](ctx));
}
const rid='12345678-1234-1234-1234-123456789abc';
for(const model of ['qwen-image-3.0','qwen-image-3.0-pro']) {
  for(const [label,image] of [['broken-base64','data:image/png;base64,INVALID'],['empty-base64','data:image/png;base64,'],['missing-base64','data:image/png,abc'],['padding','data:image/png;base64,a==='],['credentials','https://user:password@example.com/a'],['empty-host','https://'],['bad-port','https://example.com:99999/a'],['control','https://example.com/\nx'],['javascript','javascript:alert(1)']]) {
    bad(model+'.image.'+label,'buildSubmitRequest',[context(model,{image})],'QWEN_INVALID_IMAGE');
    bad(model+'.native-image.'+label,'extractUsage',[context(model,{metadata:{input:{messages:[{role:'user',content:[{text:'test'},{image}]}]}}})],'QWEN_INVALID_IMAGE');
  }
  for(const image of ['data:image/png;base64,YQ==','https://example.com/a?signature=abc%2Fdef','http://[::1]:8000/a']) add(model+'.valid-image.'+image.slice(0,22),'extractUsage',[context(model,{image})],facts(1,0,1,0));
  for(const status of ['UNKNOWN','NEW_VENDOR_STATE','']) add(model+'.uncertain.'+status,'parseTaskResult',[{model},{request_id:rid,output:{task_status:status}}],{status:'UNKNOWN',reason:'[QWEN_QUERY_UNCERTAIN] 任务结果尚未确认，请核查原任务，不要重新生成 (request_id='+rid+')'});
  add(model+'.null-query','parseTaskResult',[{model},null],{status:'UNKNOWN',reason:'[QWEN_QUERY_UNCERTAIN] 无效查询响应，请核查原任务，不要重新生成'});
  add(model+'.success-no-image','parseTaskResult',[{model},{request_id:rid,output:{task_status:'SUCCEEDED'}}],{status:'UNKNOWN',reason:'[QWEN_QUERY_UNCERTAIN] 原厂报告成功但未返回图片，需要人工核对 (request_id='+rid+')'});
  for(const terminal of [false,true]) add(model+'.query-error.'+terminal,'parseTaskResult',[{model},{request_id:rid,code:'Throttling',message:'SECRET_VALUE do not reflect',output:{task_status:terminal?'FAILED':'RUNNING'}}],{status:terminal?'FAILURE':'UNKNOWN',reason:'[QWEN_UPSTREAM_ERROR] 原厂限流，请降低请求频率；确认任务状态后再决定是否重新提交 [code=Throttling] (request_id='+rid+')'});
  bad(model+'.submit-error','parseSubmitResponse',[context(model),{body:{request_id:rid,code:'InvalidParameter',message:'SECRET_VALUE'}}],'原厂拒绝请求参数');
  for(const [label,mutate] of [
    ['width',b=>b.usage.output_width=-1],['height',b=>{b.usage.output_width=1024;b.usage.output_height='1024';}],
    ['unconfirmed',b=>b.output.finished=false],['not-success',b=>b.output.task_status='RUNNING'],
    ['error-envelope',b=>b.code='Error'],['unsafe-url',b=>b.output.choices[0].message.content[0].image='javascript:alert(1)']
  ]) {const b=result();b.request_id=rid;mutate(b);bad(model+'.reconcile.'+label,'extractUsageOnComplete',[{model},{status:'SUCCESS'},b],'QWEN_USAGE_RECONCILIATION');}
  const auto=result(0,2,'2k');auto.usage.output_width=2528;auto.usage.output_height=1696;
  add(model+'.auto-size-provider-facts','extractUsageOnComplete',[{model},{status:'SUCCESS'},auto],facts(0,0,0,2));
}
// Wan status and error behavior must remain byte-for-byte equivalent at hooks.
for(const model of ['wan3.0-video','wan3.0-video-prime','wan2.7-image']) for(const status of ['PENDING','RUNNING','UNKNOWN','FAILED','SUCCEEDED']) {
 const body={output:{task_status:status}};const ctx={model};add('wan-query.'+model+'.'+status,'parseTaskResult',[ctx,body],original.parseTaskResult(ctx,body));
}
let passed=0;
for(const c of cases){const fn=c.hook==='native'?plugin.native[c.member]:plugin[c.hook];
  if(c.expectedError) assert.throws(()=>fn(...structuredClone(c.args)),e=>e.message.includes(c.expectedError),c.name);
  else assert.deepEqual(fn(...structuredClone(c.args)),c.expected,c.name);
  passed++;
}
// Fixtures contain only fake URLs and synthetic bodies, never credentials.
fs.writeFileSync(new URL(path+'runtime.fixture.json',root),JSON.stringify({cases},null,2)+'\n');
console.log(JSON.stringify({passed,total:cases.length,paidCalls:0}));
