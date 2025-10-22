# Prompt: Implement Truly Dynamic ComplexExecutor

## Context

I have an autonomous AI app at `/Users/fondo_adam/sourceCode/autonomous-app` that currently uses **hardcoded pattern matching** in the ComplexExecutor. I want to make it **truly primitive and dynamic** so it can handle ANY request on ANY entity type without hardcoded logic.

## Current Problem

The `ComplexExecutor` in `app/api/agents/complex-executor.ts` has hardcoded workflow methods:
- `executeConditionalWorkflow()` - checks `if (input.includes("more than 3 users"))`
- `executeMultiStepWorkflow()` - checks `if (input.includes("Create three users"))`
- `executeBulkWorkflow()` - checks `if (input.includes("Admin"))`
- etc.

These methods:
❌ Only work for specific hardcoded phrases  
❌ Are hardcoded to the `users` table  
❌ Don't actually execute operations (marked as "simulated")  
❌ Require code changes for new scenarios  
❌ Violate the principle of true autonomy  

## What I Want

A **truly dynamic ComplexExecutor** that:

✅ Has **NO hardcoded if statements** checking for specific phrases  
✅ Works with **ANY entity type** (users, products, orders, etc.)  
✅ **Actually executes** database operations (no simulations)  
✅ Uses the **DynamicCrudHandler** for all operations  
✅ Lets the **AI reason** about what operations to perform  
✅ Can handle **ANY scenario** without code changes  

## Architecture Requirements

### 1. Remove Hardcoded Workflows
Delete these methods entirely:
- `executeConditionalWorkflow()`
- `executeMultiStepWorkflow()`
- `executeBulkWorkflow()`
- `executeAnalysisWorkflow()`
- `executeGenericWorkflow()`

### 2. Replace with Dynamic Execution

The ComplexExecutor should:

1. **Discover Available Operations**
   ```typescript
   const availableEntities = dynamicCrudHandler.getAvailableEntityTypes();
   const operations = ["create", "read", "update", "delete", "list"];
   ```

2. **Let AI Plan the Execution**
   - AI analyzes the request
   - AI determines which operations to call
   - AI decides the sequence and conditional logic
   - AI uses available entity types dynamically

3. **Execute Operations via DynamicCrudHandler**
   ```typescript
   // Instead of hardcoded:
   await this.convex.mutation(api.functions.users.deleteUser, {...});
   
   // Use dynamic handler:
   await this.dynamicCrudHandler.handleCrudOperation("DELETE", "users", input, entities);
   ```

4. **Handle ANY Entity Type**
   - Not just users
   - Works with products, orders, posts, etc.
   - Discovers entity types at runtime

### 3. AI-Powered Execution Flow

```typescript
async process(input: string) {
  // 1. Let AI understand what needs to be done
  const plan = await this.createExecutionPlan(input);
  
  // 2. Execute each step dynamically
  for (const step of plan.steps) {
    const result = await this.executeDynamicOperation(step);
    // Handle conditional logic based on results
  }
  
  // 3. Format and return results
  return this.formatResults(executedSteps);
}
```

The AI should generate a plan like:
```json
{
  "steps": [
    {
      "operation": "list",
      "entityType": "users",
      "purpose": "Count users to determine branching"
    },
    {
      "condition": "if count > 3",
      "operation": "delete",
      "entityType": "users",
      "target": "oldest user"
    },
    {
      "condition": "else",
      "operation": "create",
      "entityType": "users",
      "data": {"name": "TempUser", "email": "temp@demo.com"}
    }
  ]
}
```

Then execute these steps **dynamically** using the available operations.

## Key Principles

1. **Primitive Operations**
   - Only use basic CRUD operations
   - Let AI compose them into complex workflows
   - No special-case logic

2. **Entity Agnostic**
   - Works with ANY configured entity type
   - Discovers entities at runtime
   - No hardcoded table names

3. **True Autonomy**
   - AI figures out what to do
   - No pattern matching
   - Can handle scenarios we didn't anticipate

4. **Actual Execution**
   - No "simulated" operations
   - Actually call database functions
   - Return real results

## Implementation Requirements

### Must Have:
- ✅ Use `DynamicCrudHandler` for ALL database operations
- ✅ Remove ALL hardcoded pattern matching (`input.includes(...)`)
- ✅ Remove ALL entity-specific logic (no hardcoded `users` references)
- ✅ Actually execute deletes (not simulated)
- ✅ Handle conditional logic dynamically
- ✅ Work with any entity type

### Should Have:
- ✅ Robust error handling
- ✅ Clear logging of what's happening
- ✅ Validation of entity types before execution
- ✅ Graceful fallbacks if operations fail

### Nice to Have:
- ✅ Parallel execution where possible
- ✅ Transaction support (if available)
- ✅ Rollback on errors

## Example Scenarios That Should Work

After implementation, these should ALL work without code changes:

1. **Original scenario:**
   ```
   "If there are more than 3 users, delete the oldest one. 
    Otherwise, create TempUser with email temp@demo.com."
   ```

2. **Different entity:**
   ```
   "If there are fewer than 5 products, create 2 new products.
    Otherwise, delete products with price > $1000."
   ```

3. **Bulk operations:**
   ```
   "For every user with 'Admin' in their name, 
    update their email to end with '@company.com'."
   ```

4. **Complex logic:**
   ```
   "List all orders. If any are older than 30 days, 
    mark them as completed and notify the user."
   ```

All without changing ANY code!

## Files to Modify

**Primary:**
- `app/api/agents/complex-executor.ts` - Complete rewrite of execution logic

**Use/Reference:**
- `app/api/agents/dynamic-crud-handler.ts` - Use for all operations
- `app/api/agents/smart-coordinator.ts` - Already handles routing correctly

**Don't Change:**
- Classification logic (works fine)
- Coordinator routing (works fine)
- Other agents (separate concerns)

## Success Criteria

The implementation is successful when:

1. ✅ ComplexExecutor has NO `if (input.includes(...))` statements
2. ✅ ComplexExecutor uses DynamicCrudHandler for ALL operations
3. ✅ All operations are actually executed (no simulations)
4. ✅ Works with any entity type configured in DynamicCrudHandler
5. ✅ The original test scenario works AND returns actual delete results
6. ✅ Build passes: `bun run build`
7. ✅ Can handle new scenarios without code changes

## Additional Context

- The app uses Convex for the database
- There's a `DynamicCrudHandler` that handles CRUD operations for any entity type
- The system should be "primitive" - using only basic operations composed intelligently
- The AI should reason about what to do, not follow pre-programmed patterns
- This is the final piece to make the system truly autonomous

## Current Working Directory
```
/Users/fondo_adam/sourceCode/autonomous-app
```

## Request

Please implement a truly dynamic ComplexExecutor that removes all hardcoded logic and uses AI reasoning with primitive operations to handle ANY request on ANY entity type. Make it intelligent, flexible, and truly autonomous.

Build must pass after implementation: `bun run build`
