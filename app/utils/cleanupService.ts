import { supabase } from './supabase';

/**
 * Service for cleaning up test data in the database
 */
export class CleanupService {
  /**
   * Cleanup test models with various patterns to ensure all test records are removed
   * @returns Number of deleted test models
   */
  static async cleanupAllTestModels(): Promise<number> {
    try {
      // Define patterns to catch all test models
      const cleanupPatterns = [
        '_test_%',      // Standard test models
        'Test Model%',  // Another test pattern
        '%test%'        // Any model with 'test' in the name
      ];
      
      let totalDeleted = 0;
      
      console.log('Starting comprehensive test model cleanup...');
      
      for (const pattern of cleanupPatterns) {
        try {
          // Find test models matching this pattern
          const { data: testModels, error } = await supabase
            .from('ai_models')
            .select('id, name')
            .ilike('name', pattern)
            .limit(100);
            
          if (error) {
            console.error(`Error finding test models with pattern ${pattern}:`, error);
            continue;
          }
          
          if (testModels && testModels.length > 0) {
            console.log(`Found ${testModels.length} test models with pattern ${pattern}:`, 
              testModels.map((m: { name: string }) => m.name).join(', '));
              
            // Delete in batches of 20
            for (let i = 0; i < testModels.length; i += 20) {
              const batch = testModels.slice(i, i + 20);
              try {
                const { error: deleteError } = await supabase
                  .from('ai_models')
                  .delete()
                  .in('id', batch.map((m: { id: string }) => m.id));
                  
                if (deleteError) {
                  console.error(`Error deleting batch of test models:`, deleteError);
                } else {
                  totalDeleted += batch.length;
                  console.log(`Deleted ${batch.length} test models in batch`);
                }
              } catch (batchError) {
                console.error(`Error processing batch:`, batchError);
              }
              
              // Short delay between batch operations
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        } catch (patternError) {
          console.error(`Error processing pattern ${pattern}:`, patternError);
        }
      }
      
      console.log(`Successfully deleted ${totalDeleted} test models`);
      return totalDeleted;
      
    } catch (error) {
      console.error('Error in comprehensive test model cleanup:', error);
      throw error;
    }
  }
  
  /**
   * Scheduled cleanup that can be called on interval
   * @returns Number of deleted test models
   */
  static async scheduledCleanup(): Promise<number> {
    try {
      console.log('Running scheduled test model cleanup');
      return await this.cleanupAllTestModels();
    } catch (error) {
      console.error('Error in scheduled cleanup:', error);
      return 0;
    }
  }
  
  /**
   * Run cleanup with timing logs
   * @returns Number of deleted test models
   */
  static async runWithTiming(): Promise<number> {
    const startTime = Date.now();
    
    try {
      const deletedCount = await this.cleanupAllTestModels();
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      
      console.log(`Cleanup completed in ${durationMs}ms, deleted ${deletedCount} test models`);
      return deletedCount;
    } catch (error) {
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      
      console.error(`Cleanup failed after ${durationMs}ms:`, error);
      return 0;
    }
  }
}

export default CleanupService; 